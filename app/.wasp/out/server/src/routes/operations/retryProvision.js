import { createAction } from '../../middleware/operations.js'
import retryProvision from '../../actions/retryProvision.js'

export default createAction(retryProvision)
