import express from 'express'
import getMessage from './getMessage'
import postMessage from './postMessage'

export default function(router: express.Router)
{
    getMessage(router)
    postMessage(router)
}
