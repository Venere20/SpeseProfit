import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import ts from 'typescript';

type Element = { type: unknown; props: Record<string, any> };
export function componentHarness(file: URL, dependencies: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const slots: any[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const hooks = {
    ...React,
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect: () => void, deps?: unknown[]) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        effects.push(() => { previous?.cleanup?.(); const cleanup = effect(); slots[index] = { deps, cleanup }; });
      }
    },
    useCallback(callback: any, deps: unknown[]) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i]))) slots[index] = { deps, callback };
      return slots[index].callback;
    },
  };
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(compiled, { exports, React: hooks, ...extra, require(name: string) {
    if (name === 'react') return hooks;
    if (name in dependencies) return dependencies[name];
    throw new Error('Unexpected dependency: ' + name);
  } });
  return {
    exports,
    render(name = 'default', props: Record<string, unknown> = {}): Element {
      cursor = 0; effects.length = 0;
      return exports[name](props);
    },
    flushEffects() { for (const effect of effects.splice(0)) effect(); },
  };
}
export function elements(node: any): Element[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
export const components = { Button: 'Button', Card: 'Card', Field: 'Field', Page: 'Page', Choice: 'Choice', Choices: 'Choices' };
