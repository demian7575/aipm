import morgan from 'morgan';

export const httpLogger = morgan(':method :url :status :response-time ms');
