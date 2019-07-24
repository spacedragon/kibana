/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericClassDecorator, Type } from './util';
import { Injector } from './injector';

/**
 * @returns {GenericClassDecorator<Type<any>>}
 * @constructor
 */
export const Inject = (): GenericClassDecorator<Type<any>> => {
  return (target: Type<any>) => {
    target.__injectable = true;
  };
};

/**
 * @returns {GenericClassDecorator<Type<any>>}
 * @constructor
 */
export const Singleton = (): GenericClassDecorator<Type<any>> => {
  return (target: Type<any>) => {
    target.__singleton = true;
    target.__injectable = true;
  };
};

export const Named = (name: string) => {
  return (...args: any[]) => {
    const target = args[0];
    switch (args.length) {
      case 1:
        Injector.provideNamed(name, target);
        return;
      case 3:
        if (typeof args[2] === 'number') {
          const index = args[2];
          const namedKey = `__named_parameters_${index}`;
          target[namedKey] = name;
          return;
        }
      default:
        throw new Error('Named decorators are not valid here!');
    }
  };
};
