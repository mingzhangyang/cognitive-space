import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const ensureFrom = () => ({
    postcssPlugin: 'ensure-from',
    Once(root, { result }) {
        if (result.opts.from) return;
        const input = root?.source?.input;
        if (input?.file) {
            result.opts.from = input.file;
        } else if (input?.id) {
            result.opts.from = input.id;
        }
    },
});

const fixMissingSourceFile = () => ({
    postcssPlugin: 'fix-missing-source-file',
    Once(root, { result }) {
        const fallbackFrom =
            result.opts.from ||
            root?.source?.input?.file ||
            root?.source?.input?.id;
        if (!fallbackFrom) return;

        root.walkDecls((decl) => {
            if (!decl.source) {
                decl.source = root.source;
            }
            if (decl.source?.input && !decl.source.input.file) {
                decl.source.input.file = fallbackFrom;
            }
        });
    },
});

export default {
    plugins: [
        ensureFrom(),
        tailwindcss(),
        autoprefixer(),
        fixMissingSourceFile(),
    ],
}
