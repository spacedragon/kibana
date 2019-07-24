/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import crypto from 'crypto';
import { Server } from 'hapi';
import * as _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { Logger } from './log';
import { JAVA } from './lsp/language_servers';
import { ServerOptions } from './server_options';
import { checkCodeNode, checkRoute } from './routes/check';
import { CodeServices } from './distributed/code_services';
import { LocalHandlerAdapter } from './distributed/local_handler_adapter';
import {
  GitServiceDefinition,
  WorkspaceDefinition,
  LspServiceDefinition,
  RepositoryServiceDefinition,
  SetupDefinition,
  GitServiceDefinitionOption,
  LspServiceDefinitionOption,
} from './distributed/apis';
import { CodeNodeAdapter } from './distributed/multinode/code_node_adapter';
import { NonCodeNodeAdapter } from './distributed/multinode/non_code_node_adapter';
import { InitWorkers } from './init_workers';
import { InitLocal } from './init_local';
import { InitEs } from './init_es';
import { InitQueue } from './init_queue';
import { Injector } from './lib/di/injector';
import { InitRoutes } from './init_routes';

async function retryUntilAvailable<T>(
  func: () => Promise<T>,
  intervalMs: number,
  retries: number = Number.MAX_VALUE
): Promise<T> {
  const value = await func();
  if (value) {
    return value;
  } else {
    const promise = new Promise<T>(resolve => {
      const retry = () => {
        func().then(v => {
          if (v) {
            resolve(v);
          } else {
            retries--;
            if (retries > 0) {
              setTimeout(retry, intervalMs);
            } else {
              resolve(v);
            }
          }
        });
      };
      setTimeout(retry, intervalMs);
    });
    return await promise;
  }
}

export function init(server: Server, options: any) {
  Injector.provides(Server, () => server);
  if (!options.ui.enabled) {
    return;
  }
  const serverOptions = new ServerOptions(options, server.config());
  Injector.provides(ServerOptions, () => serverOptions);
  const log = new Logger(server);
  Injector.provides(Logger, () => log);
  const xpackMainPlugin: XPackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: 'code',
    name: i18n.translate('xpack.code.featureRegistry.codeFeatureName', {
      defaultMessage: 'Code',
    }),
    icon: 'codeApp',
    navLinkId: 'code',
    app: ['code', 'kibana'],
    catalogue: [], // TODO add catalogue here
    privileges: {
      all: {
        api: ['code_user', 'code_admin'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user', 'admin'],
      },
      read: {
        api: ['code_user'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user'],
      },
    },
  });

  // @ts-ignore
  const kbnServer = this.kbnServer;

  kbnServer.ready().then(async () => {
    const codeNodeUrl = serverOptions.codeNodeUrl;
    const rndString = crypto.randomBytes(20).toString('hex');
    checkRoute(server, rndString);
    if (codeNodeUrl) {
      const checkResult = await retryUntilAvailable(
        async () => await checkCodeNode(codeNodeUrl, log, rndString),
        3000
      );
      if (checkResult.me) {
        Injector.provideNamed('serviceAdapter', CodeNodeAdapter);
        log.info('Initializing Code plugin as code-node.');
        await initCodeNode();
      } else {
        Injector.provideNamed('serviceAdapter', () => new NonCodeNodeAdapter(codeNodeUrl, log));
        log.info(
          `Initializing Code plugin as non-code node, redirecting all code requests to ${codeNodeUrl}`
        );
        await initNonCodeNode();
      }
    } else {
      Injector.provideNamed('serviceAdapter', LocalHandlerAdapter);
      // codeNodeUrl not set, single node mode
      log.info('Initializing Code plugin as single-node.');
      initDevMode(server);
      await initCodeNode();
    }
  });
}

async function initNonCodeNode() {
  const codeServices = Injector.resolve(CodeServices);
  codeServices.registerHandler(GitServiceDefinition, null, GitServiceDefinitionOption);
  codeServices.registerHandler(RepositoryServiceDefinition, null);
  codeServices.registerHandler(LspServiceDefinition, null, LspServiceDefinitionOption);
  codeServices.registerHandler(WorkspaceDefinition, null);
  codeServices.registerHandler(SetupDefinition, null);
  await Injector.resolve(InitEs).init();
  Injector.resolve(InitRoutes);
}

async function initCodeNode() {
  await Injector.resolve(InitEs).init();
  Injector.resolve(InitQueue);

  Injector.resolve(InitLocal);
  Injector.resolve(InitWorkers);

  Injector.resolve(InitRoutes);
}

function initDevMode(server: Server) {
  // @ts-ignore
  const devMode: boolean = server.config().get('env.dev');
  server.injectUiAppVars('code', () => ({
    enableLangserversDeveloping: devMode,
  }));
  // Enable the developing language servers in development mode.
  if (devMode) {
    JAVA.downloadUrl = _.partialRight(JAVA!.downloadUrl!, devMode);
  }
}
