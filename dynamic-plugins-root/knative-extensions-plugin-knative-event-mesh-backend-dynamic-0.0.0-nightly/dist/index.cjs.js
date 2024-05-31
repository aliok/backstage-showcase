'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var knativeEventMeshProcessor = require('./cjs/knativeEventMeshProcessor-b7893559.cjs.js');
var catalogClient = require('@backstage/catalog-client');
require('@backstage/catalog-model');
require('@backstage/backend-tasks');

const dynamicPluginInstaller = {
  kind: "legacy",
  async catalog(builder, env) {
    const knativeEventMeshProviders = knativeEventMeshProcessor.KnativeEventMeshProvider.fromConfig(env.config, {
      logger: env.logger,
      scheduler: env.scheduler
    });
    builder.addEntityProvider(knativeEventMeshProviders);
    const catalogApi = new catalogClient.CatalogClient({
      discoveryApi: env.discovery
    });
    const knativeEventMeshProcessor$1 = new knativeEventMeshProcessor.KnativeEventMeshProcessor(catalogApi, env.logger);
    builder.addProcessor(knativeEventMeshProcessor$1);
  }
};

exports.KnativeEventMeshProcessor = knativeEventMeshProcessor.KnativeEventMeshProcessor;
exports.KnativeEventMeshProvider = knativeEventMeshProcessor.KnativeEventMeshProvider;
exports.dynamicPluginInstaller = dynamicPluginInstaller;
//# sourceMappingURL=index.cjs.js.map
