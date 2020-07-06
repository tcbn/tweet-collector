import merge from 'webpack-merge'
import common from './webpack.config'

const config = merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',
	plugins: [
	]
})

export default config