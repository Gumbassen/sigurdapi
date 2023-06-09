import { Router } from 'express'
import deleteEntry from './deleteEntry'
import messages from './messages/messages'
import postEntry from './postEntry'
import getEntry from './getEntry'
import putEntry from './putEntry'

export default function(router: Router)
{
    getEntry(router)
    postEntry(router)
    putEntry(router)
    deleteEntry(router)
    messages(router)
}
