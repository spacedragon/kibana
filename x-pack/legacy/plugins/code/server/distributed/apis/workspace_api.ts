/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { ServiceHandlerFor } from '../service_definition';
import { WorkspaceHandler } from '../../lsp/workspace_handler';
import { RepoConfig } from '../../../model';
import { WorkspaceCommand } from '../../lsp/workspace_command';
import { Logger } from '../../log';
import { Inject } from '../../lib/di/inject_decorator';

export const WorkspaceDefinition = {
  initCmd: {
    request: {} as { repoUri: string; revision: string; repoConfig: RepoConfig; force: boolean },
    response: {},
  },
};

@Inject
export class WorkspaceServiceHandler implements ServiceHandlerFor<typeof WorkspaceDefinition> {
  constructor(
    private readonly server: Server,
    private readonly workspaceHandler: WorkspaceHandler
  ) {}
  async initCmd({ repoUri, revision, repoConfig, force }) {
    try {
      const { workspaceDir, workspaceRevision } = await this.workspaceHandler.openWorkspace(
        repoUri,
        revision
      );
      const log = new Logger(this.server, ['workspace', repoUri]);

      const workspaceCmd = new WorkspaceCommand(repoConfig, workspaceDir, workspaceRevision, log);
      await workspaceCmd.runInit(force);
      return {};
    } catch (e) {
      if (e.isBoom) {
        return e;
      }
    }
  }
}
