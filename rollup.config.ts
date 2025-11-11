import path from "node:path";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const input = "src/index.ts";
const outDir = "dist";

export default [
    {
        input,
        output: [
            { name: 'PEX', file: path.join(outDir, "pex.mjs"), format: "esm", sourcemap: true },
            { name: 'PEX', file: path.join(outDir, "pex.cjs"), format: "cjs", sourcemap: true, exports: "named" },
            { name: 'PEX', file: path.join(outDir, "pex.js"),  format: "umd", sourcemap: true },
        ],
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs(),
            typescript({ tsconfig: "./tsconfig.json", outputToFilesystem: true }),
            terser()
        ],
        external: [ ]
    },
    {
        input: "dist/types/index.d.ts",
        output: [{ file: path.join(outDir, "pex.d.ts"), format: "es" }],
        plugins: [dts()],
    }
];
