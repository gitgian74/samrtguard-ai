/**
 * Appwrite configuration based on official documentation
 * https://appwrite.io/docs/quick-starts/react
 */

import { Client, Account, ID } from 'appwrite'

// Appwrite configuration
export const client = new Client()

client
  .setEndpoint('https://fra.cloud.appwrite.io/v1') // Frankfurt region
  .setProject('68ca961c0010e0ca62ad') // Replace with your project ID

export const account = new Account(client)
export { ID } from 'appwrite'
