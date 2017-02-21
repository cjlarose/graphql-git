import graphqlHTTP from 'express-graphql';
import express from 'express';
import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import Git from 'nodegit';
import repoType from './schema';

const REPO_DIR = process.env['REPO_DIR'] || console.error('Missing REPO_DIR env var') || process.exit(1);

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      self: {
        type: repoType,
        resolve() {
          return Git.Repository.open(REPO_DIR);
        },
      },
    },
  }),
});

express()
  .use('/graphql', graphqlHTTP({ schema, pretty: true, graphiql: true }))
  .listen(3000);

console.log('GraphQL server running on http://localhost:3000/graphql');
