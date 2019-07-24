/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceHandlerFor } from '../service_definition';
import { CloneWorker, DeleteWorker, IndexWorker } from '../../queue';

export const RepositoryServiceDefinition = {
  clone: {
    request: {} as { url: string },
    response: {},
  },
  delete: {
    request: {} as { uri: string },
    response: {},
  },
  index: {
    request: {} as {
      uri: string;
      revision: string | undefined;
      enforceReindex: boolean;
    },
    response: {},
  },
};

export class RepositoryServiceHandler
  implements ServiceHandlerFor<typeof RepositoryServiceDefinition> {
  constructor(
    private readonly cloneWorker: CloneWorker,
    private readonly deleteWorker: DeleteWorker,
    private readonly indexWorker: IndexWorker
  ) {}

  async clone(payload: { url: string }) {
    await this.cloneWorker.enqueueJob(payload, {});
    return {};
  }
  async delete(payload: { uri: string }) {
    await this.deleteWorker.enqueueJob(payload, {});
    return {};
  }
  async index(payload: { uri: string; revision: string | undefined; enforceReindex: boolean }) {
    await this.indexWorker.enqueueJob(payload, {});
    return {};
  }
}
