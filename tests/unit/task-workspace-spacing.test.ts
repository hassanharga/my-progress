import { execFileSync } from 'node:child_process';

it('keeps task progress and session rows compact in the compiled CSS', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { readFileSync } from 'node:fs';
       import { resolve } from 'node:path';
       import { createRequire } from 'node:module';
       import tailwindcss from '@tailwindcss/postcss';
       const postcss = createRequire(import.meta.resolve('@tailwindcss/postcss'))('postcss');
       const path = resolve('src/app/globals.css');
       const result = await postcss([tailwindcss()]).process(readFileSync(path, 'utf8'), { from: path });
       const padding = [];
       result.root.walkRules((rule) => {
         if (!rule.selector.includes('.task-work-log') || !rule.selector.includes('.task-session-list')) return;
         if (!rule.selector.includes('> li')) return;
         rule.walkDecls('padding-block', (declaration) => padding.push(declaration.value));
       });
       process.stdout.write(JSON.stringify(padding));`,
    ],
    { cwd: process.cwd(), encoding: 'utf8' }
  );

  expect(JSON.parse(output)).toEqual(['0.75rem']);
});
