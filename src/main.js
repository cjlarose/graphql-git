import graphqlHTTP from 'express-graphql';
import express from 'express';
import schema from './schema';

express()
  .use('/graphql', graphqlHTTP({ schema, pretty: true, graphiql: true }))
  .listen(3000);

console.log('GraphQL server running on http://localhost:3000/graphql');
