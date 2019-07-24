/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'reflect-metadata';
import { Type } from './Util';
import { CircularDepsError } from './circular_error';

type Factory<T> = () => T;
/**
 * The Injector stores services and resolves requested instances.
 */
export const Injector = new (class {
  singletons: Map<any, any> = new Map();
  factories: Map<any, any> = new Map();
  namedTypes: Map<string, Type<any> | Factory<any>> = new Map();
  /**
   * Resolves instances by injecting required services
   * @param {Type<any>} target
   * @returns {T}
   */
  resolve<T>(target: Type<T>): T {
    return this.resolve0(target, []);
  }
  private resolve0<T>(target: Type<any>, dependants: Array<Type<any>>): T {
    if (target === undefined || dependants.indexOf(target) >= 0) {
      throw new CircularDepsError(dependants);
    }
    if (this.factories.has(target)) {
      return this.factories.get(target)();
    }
    if (!target.__injectable) {
      throw new Error(
        `${target.name} is not injectable, please check ${dependants.map(d => d.name).join(' -> ')}`
      );
    }
    if (target.__singleton) {
      if (this.singletons.has(target)) {
        return this.singletons.get(target);
      }
    }

    // tokens are required dependencies, while injections are resolved tokens from the Injector
    // @ts-ignore
    const tokens = Reflect.getMetadata('design:paramtypes', target) || [],
      injections = tokens.map((token: any, index: number) => {
        const namedKey = `__named_parameters_${index}`;
        const name = target[namedKey];
        if (name) {
          return this.resolveNamed(name, [...dependants, target]);
        }
        return this.resolve0<any>(token, [...dependants, target]);
      });

    const instance = new target(...injections);
    if (target.__singleton) {
      this.singletons.set(target, instance);
    }
    return instance;
  }
  resolveNamed<T>(name: string, dependants: Array<Type<any>> = []): T {
    if (this.namedTypes.has(name)) {
      const named = this.namedTypes.get(name);
      if ((named as Type<any>).__injectable) {
        return this.resolve0(named as Type<any>, dependants);
      }
      return (named as Function)();
    }
    throw new Error(`named type ${name} not found.`);
  }

  provideNamed<T>(name: string, target: Type<T> | Factory<T>) {
    this.namedTypes.set(name, target);
  }

  provides<T>(target: Type<any>, func: () => T) {
    this.factories.set(target, func);
  }
})();
