/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { CodeServerRouter } from '../security';
import { CodeServices } from '../distributed/code_services';
import { SetupDefinition } from '../distributed/apis';

export function setupRoute(server: CodeServerRouter, codeServices: CodeServices) {
  const setupService = codeServices.serviceFor(SetupDefinition);
  server.route({
    method: 'get',
    path: '/api/code/setup',
    async handler(req: Request) {
      const endpoint = await codeServices.locate(req, '');
      return await setupService.setup(endpoint, {});
    },
  });
}
