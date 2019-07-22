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
import { LspIndexerFactory } from './indexer';
import { CancellationSerivce, CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './queue';
import { RepositoryServiceFactory } from './repository_service_factory';
import { getRepositoryHandler, RepositoryServiceDefinition } from './distributed/apis';
import { CloneScheduler, IndexScheduler, UpdateScheduler } from './scheduler';
import { Logger } from './log';

export function initWorkers(
  server: Server,
  log: Logger,
  esClient: EsClient,
  queue: Esqueue,
  lspService: LspService,
  gitOps: GitOperations,
  serverOptions: ServerOptions,
  codeServices: CodeServices
) {
  // Initialize indexing factories.
  const lspIndexerFactory = new LspIndexerFactory(lspService, serverOptions, gitOps, esClient, log);

  // Initialize queue worker cancellation service.
  const cancellationService = new CancellationSerivce();
  const indexWorker = new IndexWorker(
    queue,
    log,
    esClient,
    [lspIndexerFactory],
    gitOps,
    cancellationService
  ).bind();

  const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

  const cloneWorker = new CloneWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    indexWorker,
    repoServiceFactory,
    cancellationService
  ).bind();
  const deleteWorker = new DeleteWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    cancellationService,
    lspService,
    repoServiceFactory
  ).bind();
  const updateWorker = new UpdateWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    repoServiceFactory,
    cancellationService
  ).bind();

  codeServices.registerHandler(
    RepositoryServiceDefinition,
    getRepositoryHandler(cloneWorker, deleteWorker, indexWorker)
  );

  // Initialize schedulers.
  const cloneScheduler = new CloneScheduler(cloneWorker, serverOptions, esClient, log);
  const updateScheduler = new UpdateScheduler(updateWorker, serverOptions, esClient, log);
  const indexScheduler = new IndexScheduler(indexWorker, serverOptions, esClient, log);
  updateScheduler.start();
  if (!serverOptions.disableIndexScheduler) {
    indexScheduler.start();
  }
  // Check if the repository is local on the file system.
  // This should be executed once at the startup time of Kibana.
  cloneScheduler.schedule();
  server.events.on('stop', async () => {
    await gitOps.cleanAllRepo();
    if (!serverOptions.disableIndexScheduler) {
      indexScheduler.stop();
    }
    updateScheduler.stop();
    queue.destroy();
  });
}
