import { generator } from './schemas';

const doc = generator.generateDocument({
  info: {
    title: 'Shared Schemas',
    version: '0.1.0'
  }
});

console.log(JSON.stringify(doc, null, 2));
