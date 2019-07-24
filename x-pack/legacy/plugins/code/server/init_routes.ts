/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Singleton } from './lib/di/inject_decorator';
import { RepositoryConfigController } from './repository_config_controller';
import { RepositoryIndexInitializerFactory } from './indexer';
import { CodeServices } from './distributed/code_services';
import { ServerOptions } from './server_options';
import { documentSearchRoute, repositorySearchRoute, symbolSearchRoute } from './routes/search';
import { repositoryRoute } from './routes/repository';
import { CodeServerRouter } from './security';
import { fileRoute } from './routes/file';
import { workspaceRoute } from './routes/workspace';
import { lspRoute, symbolByQnameRoute } from './routes/lsp';
import { installRoute } from './routes/install';
import { setupRoute } from './routes/setup';
import { statusRoute } from './routes/status';
import { Logger } from './log';

@Singleton
export class InitRoutes {
  constructor(
    private readonly codeServerRouter: CodeServerRouter,
    private readonly serverOptions: ServerOptions,
    private readonly codeServices: CodeServices,
    private readonly log: Logger,
    private readonly repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
    private readonly repoConfigController: RepositoryConfigController
  ) {
    repositoryRoute(
      codeServerRouter,
      codeServices,
      repoIndexInitializerFactory,
      repoConfigController,
      serverOptions
    );
    repositorySearchRoute(codeServerRouter, log);
    documentSearchRoute(codeServerRouter, log);
    symbolSearchRoute(codeServerRouter, log);
    fileRoute(codeServerRouter, codeServices);
    workspaceRoute(codeServerRouter, serverOptions, codeServices);
    symbolByQnameRoute(codeServerRouter, log);
    installRoute(codeServerRouter, codeServices);
    lspRoute(codeServerRouter, codeServices, serverOptions);
    setupRoute(codeServerRouter, codeServices);
    statusRoute(codeServerRouter, codeServices);
  }
}
