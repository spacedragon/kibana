/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

const PORT_MAX = 256 * 256 - 1;
export const portSchema = () => schema.number({ min: 1, max: PORT_MAX });
