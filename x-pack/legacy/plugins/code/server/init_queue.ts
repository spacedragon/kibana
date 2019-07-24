/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { EsClient, Esqueue } from './lib/esqueue';
import { Injector } from './lib/di/injector';
import { Named, Singleton } from './lib/di/inject_decorator';

@Singleton
export class InitQueue {
  constructor(
    private readonly server: Server,
    @Named('EsInternal') private readonly esClient: EsClient
  ) {
    const queueIndex: string = server.config().get('xpack.code.queueIndex');
    const queueTimeoutMs: number = server.config().get('xpack.code.queueTimeoutMs');
    const queue = new Esqueue(queueIndex, {
      client: esClient,
      timeout: queueTimeoutMs,
    });
    Injector.provides(Esqueue, () => queue);
  }
}
