import {
  APP_INITIALIZER,
  ComponentFactoryResolver,
  NgModuleRef,
  Provider,
  RendererFactory2,
  Type,
  ViewEncapsulation
} from '@angular/core';
import { Router } from '@angular/router';
import { whenSet } from '@codebakery/origami/util';
import { importStyleModule } from './import-style-module';
import { getStyleModulesFor } from './include-styles';
import { styleToEmulatedEncapsulation } from './style-to-emulated-encapsulation';
import { getTypeFor, scanComponentFactoryResolver } from './type-selectors';

/**
 * Provider that ensures `injectIncludeStyles()` will run on application
 * startup before components are created.
 */
export const INJECT_STYLES_PROVIDER: Provider = {
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: injectIncludeStyles,
  deps: [NgModuleRef]
};

/**
 * Returns a callback that, when invoked, will use the provided `NgModuleRef`
 * to patch the renderer factory and scan the component factory resolver in
 * order to enable injecting Polymer style modules for components decorated with
 * `@IncludeStyles()`.
 *
 * This function will additionally listen to any lazy-loaded modules from
 * Angular's router and scan component factory resolvers that are added after
 * the app has initialized.
 *
 * @param ngModule the root `NgModule` reference
 * @returns a callback that will begin the injection process
 */
export function injectIncludeStyles(ngModule: NgModuleRef<any>): () => void {
  return () => {
    patchRendererFactory(ngModule.injector.get(RendererFactory2));
    scanComponentFactoryResolver(
      ngModule.injector.get(ComponentFactoryResolver)
    );
    const router = <Router>ngModule.injector.get(Router);
    router.events.subscribe(e => {
      if ('route' in e && !(<any>e.route)._loadedConfig) {
        whenSet(<any>e.route, '_loadedConfig', undefined, config => {
          scanComponentFactoryResolver(
            config.module.injector.get(ComponentFactoryResolver)
          );
        });
      }
    });
  };
}

const INJECTED_SELECTORS: string[] = [];

/**
 * Patches a `RendererFactory2` to overwrite `createRenderer()` and add styles
 * imported from Polymer style modules according to `@IncludeStyles()`
 * decorators to the `RendererType2` data for the element.
 *
 * If the element type using emulated view encapsulation, the styles imported
 * will be converted to preserve encapsulation.
 *
 * @param factory the renderer factory to patch
 */
export function patchRendererFactory(factory: RendererFactory2) {
  const $createRenderer = factory.createRenderer;
  factory.createRenderer = function(element, type) {
    const selector = element && element.localName;
    if (selector && type && INJECTED_SELECTORS.indexOf(selector) === -1) {
      const styleModules = getStyleModulesFor(getTypeFor(selector));
      let styles = styleModules.map(styleModule =>
        importStyleModule(styleModule)
      );
      switch (type.encapsulation) {
        case ViewEncapsulation.Emulated:
        default:
          styles = styles.map(style =>
            styleToEmulatedEncapsulation(style, type.id)
          );
          break;
        case ViewEncapsulation.None:
        case ViewEncapsulation.Native:
        case ViewEncapsulation.ShadowDom:
          break;
      }

      type.styles.push(...styles);
      INJECTED_SELECTORS.push(selector);
    }

    return $createRenderer.apply(this, arguments);
  };
}
