import rdf from 'rdf-ext'
import { fromFile, toFile } from 'rdf-utils-fs'

export async function readDataset(filename) {
    const stream = fromFile(filename)
    const dataset = await rdf.dataset().import(stream)
    return dataset
}

export async function writeDataset(dataset, filename) {
    await toFile(dataset.toStream(), filename)
}
