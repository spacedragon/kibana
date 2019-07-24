/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { Named, Singleton } from './lib/di/inject_decorator';
import { tryMigrateIndices } from './indexer';
import { EsClient } from './lib/esqueue';
import { Logger } from './log';

@Singleton
export class InitEs {
  constructor(
    private readonly server: Server,
    @Named('EsInternal') private readonly esClient: EsClient,
    private readonly log: Logger
  ) {}

  async init() {
    // @ts-ignore
    await this.server.plugins.elasticsearch.waitUntilReady();

    // Execute index version checking and try to migrate index data if necessary.
    await tryMigrateIndices(this.esClient, this.log);
  }
}
