import path from 'path'
import { fileURLToPath } from 'url'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
    entry: './src/js/main.js', // Entry point remains the same
    resolve: {
        extensions: ['.js', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src') // Alias '@' points to the src directory
        }
    },
    output: {
        filename: '[name].bundle.js', // Added .bundle for clarity
        path: path.resolve(__dirname, 'dist/public'), // Output directly to dist/public
        publicPath: '/', // Serve assets from the root
        clean: true, // Clean the output directory before build
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'dist/public') // Serve static files from dist/public
        },
        port: 9090,
        open: true,
        // History API fallback might be needed for single-page applications
        // historyApiFallback: true, 
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src/html/index.html'), // Path to your template
            filename: 'index.html', // Output filename
            inject: 'body' // Inject scripts into the body
        }),
        new CopyWebpackPlugin({
            patterns: [
                // HTML copying is now handled by HtmlWebpackPlugin
                // {
                //     // Copy HTML files from src/html to dist/public
                //     from: path.resolve(__dirname, 'src/html'),
                //     to: path.resolve(__dirname, 'dist/public'),
                //     globOptions: {
                //         ignore: ['**/.*'], // Example: ignore dotfiles
                //     },
                // },
                {
                    // Copy CSS files from src/css to dist/public/css
                    from: path.resolve(__dirname, 'src/css'),
                    to: path.resolve(__dirname, 'dist/public/css'),
                    globOptions: {
                        ignore: ['**/.*'], // Example: ignore dotfiles
                    },
                }
            ]
        })
    ],
    mode: 'development', // Set mode (development or production)
    devtool: 'inline-source-map', // Add source maps for easier debugging
}
