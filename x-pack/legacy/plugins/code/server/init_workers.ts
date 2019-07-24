/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { EsClient, Esqueue } from './lib/esqueue';
import { LspService } from './lsp/lsp_service';
import { GitOperations } from './git_operations';
import { ServerOptions } from './server_options';
import { CodeServices } from './distributed/code_services';
import { CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './queue';
import { RepositoryServiceDefinition, RepositoryServiceHandler } from './distributed/apis';
import { CloneScheduler, IndexScheduler, UpdateScheduler } from './scheduler';
import { Logger } from './log';

export class InitWorkers {
  constructor(
    private readonly server: Server,
    private readonly log: Logger,
    private readonly esClient: EsClient,
    private readonly queue: Esqueue,
    private readonly lspService: LspService,
    private readonly gitOps: GitOperations,
    private readonly serverOptions: ServerOptions,
    private readonly codeServices: CodeServices,
    private readonly indexWorker: IndexWorker,
    private readonly deleteWorker: DeleteWorker,
    private readonly updateWorker: UpdateWorker,
    private readonly cloneWorker: CloneWorker,
    private readonly repositoryServiceHandler: RepositoryServiceHandler,
    private readonly cloneScheduler: CloneScheduler,
    private readonly updateScheduler: UpdateScheduler,
    private readonly indexScheduler: IndexScheduler
  ) {
    indexWorker.bind();
    cloneWorker.bind();
    deleteWorker.bind();
    updateWorker.bind();

    codeServices.registerHandler(RepositoryServiceDefinition, repositoryServiceHandler);

    // Initialize schedulers.
    cloneScheduler.schedule();
    updateScheduler.start();
    if (!serverOptions.disableIndexScheduler) {
      indexScheduler.start();
    }
    // Check if the repository is local on the file system.
    // This should be executed once at the startup time of Kibana.
    server.events.on('stop', async () => {
      await gitOps.cleanAllRepo();
      if (!serverOptions.disableIndexScheduler) {
        indexScheduler.stop();
      }
      updateScheduler.stop();
      queue.destroy();
    });
  }
}
