import { DomModule } from '@polymer/polymer/lib/elements/dom-module';

/**
 * Style module CSS text cached by id.
 */
let CACHED_STYLE_MODULES = new Map<string, string>();

/**
 * Imports a `<dom-module id="name">` style module by its id and returns the
 * `<style>` content for the module. Ensure that the module is imported and
 * added to the DOM before calling `importStyleModule()`.
 *
 * @param styleModule the named id of the style module to import
 * @returns the style module's CSS text, or an empty string if the module does
 *   not exist
 */
export function importStyleModule(styleModule: string): string {
  if (!CACHED_STYLE_MODULES.has(styleModule)) {
    const styleTemplate = <HTMLTemplateElement | undefined>(
      DomModule.import(styleModule, 'template')
    );
    if (styleTemplate) {
      const styles = styleTemplate.content.querySelectorAll('style');
      CACHED_STYLE_MODULES.set(
        styleModule,
        Array.from(styles)
          .map(style => style.innerText)
          .join('\n')
      );
    } else {
      CACHED_STYLE_MODULES.set(styleModule, '');
    }
  }

  return CACHED_STYLE_MODULES.get(styleModule)!;
}

/**
 * Resets the cache using by `importStyleModule()`, primarily used for testing.
 */
export function clearStyleModuleCache() {
  CACHED_STYLE_MODULES = new Map();
}
