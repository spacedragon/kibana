/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from './util';

export class CircularDepsError extends Error {
  constructor(readonly deps: Array<Type<any>>) {
    super('You may have circular dependencies, please check ' + deps.map(d => d.name).join(' -> '));
  }
}
