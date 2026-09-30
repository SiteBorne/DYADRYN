import { parentPort, workerData } from 'node:worker_threads';
import { health } from './health.mjs';
for (const v of workerData.jobs) parentPort.postMessage(await health(v.id, v.o, workerData.N));
parentPort.postMessage('done');
