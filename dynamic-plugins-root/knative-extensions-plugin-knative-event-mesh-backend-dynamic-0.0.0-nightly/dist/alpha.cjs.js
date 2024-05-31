'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var backendCommon = require('@backstage/backend-common');
var backendPluginApi = require('@backstage/backend-plugin-api');
var catalogClient = require('@backstage/catalog-client');
var alpha = require('@backstage/plugin-catalog-node/alpha');
var knativeEventMeshProcessor = require('./cjs/knativeEventMeshProcessor-b7893559.cjs.js');
require('@backstage/catalog-model');
require('@backstage/backend-tasks');

const catalogModuleKnativeEventMesh = backendPluginApi.createBackendModule({
  moduleId: "knative-event-mesh-module",
  pluginId: "catalog",
  register(env) {
    env.registerInit({
      deps: {
        catalog: alpha.catalogProcessingExtensionPoint,
        config: backendPluginApi.coreServices.rootConfig,
        logger: backendPluginApi.coreServices.logger,
        scheduler: backendPluginApi.coreServices.scheduler,
        discovery: backendPluginApi.coreServices.discovery
      },
      async init({ catalog, config, logger, scheduler, discovery }) {
        const knativeEventMeshProviders = knativeEventMeshProcessor.KnativeEventMeshProvider.fromConfig(config, {
          logger: backendCommon.loggerToWinstonLogger(logger),
          scheduler
        });
        catalog.addEntityProvider(knativeEventMeshProviders);
        const catalogApi = new catalogClient.CatalogClient({
          discoveryApi: discovery
        });
        const knativeEventMeshProcessor$1 = new knativeEventMeshProcessor.KnativeEventMeshProcessor(catalogApi, backendCommon.loggerToWinstonLogger(logger));
        catalog.addProcessor(knativeEventMeshProcessor$1);
      }
    });
  }
});

exports["default"] = catalogModuleKnativeEventMesh;
//# sourceMappingURL=alpha.cjs.js.map
