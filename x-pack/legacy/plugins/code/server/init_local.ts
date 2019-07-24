/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { ServerOptions } from './server_options';
import { CodeServices } from './distributed/code_services';
import { GitOperations } from './git_operations';
import { Logger } from './log';
import {
  GitServiceDefinition,
  GitServiceDefinitionOption,
  GitServiceHandler,
  LspServiceDefinition,
  LspServiceDefinitionOption,
  LspServiceHandler,
  SetupDefinition,
  setupServiceHandler,
  WorkspaceDefinition,
  WorkspaceServiceHandler,
} from './distributed/apis';
import { LspService } from './lsp/lsp_service';
import { Singleton } from './lib/di/inject_decorator';

@Singleton
export class InitLocal {
  constructor(
    private readonly server: Server,
    private readonly log: Logger,
    private readonly serverOptions: ServerOptions,
    private readonly codeServices: CodeServices,
    private readonly gitServiceHandler: GitServiceHandler,
    private readonly lspService: LspService,
    private readonly gitOps: GitOperations,
    private readonly lspServiceHandler: LspServiceHandler,
    private readonly workspaceServiceHandler: WorkspaceServiceHandler
  ) {
    codeServices.registerHandler(
      GitServiceDefinition,
      gitServiceHandler,
      GitServiceDefinitionOption
    );

    server.events.on('stop', async () => {
      log.debug('shutdown lsp process');
      lspService.shutdown();
      gitOps.cleanAllRepo();
    });
    codeServices.registerHandler(
      LspServiceDefinition,
      lspServiceHandler,
      LspServiceDefinitionOption
    );
    codeServices.registerHandler(WorkspaceDefinition, workspaceServiceHandler);
    codeServices.registerHandler(SetupDefinition, setupServiceHandler);
  }
}
