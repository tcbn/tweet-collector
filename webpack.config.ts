import * as webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'

const config: webpack.Configuration = {
	entry: './src/main.ts',
	target: 'node',
	mode: 'production',
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: ['ts-loader'],
				exclude: /node_modules/,
			}
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	externals: [nodeExternals()],
}

export default config