import Git from 'nodegit';
import { GraphQLSchema,
         GraphQLString,
         GraphQLObjectType } from 'graphql';

const REPO_DIR = process.env['REPO_DIR'] || console.error('Missing REPO_DIR env var') || process.exit(1);

const commitType = new GraphQLObjectType({
  name: 'Commit',
  fields: {
    date: {
      type: GraphQLString,
      resolve(commit) {
        return commit.date().toISOString();
      },
    },
  },
});

const repoType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    path: { type: GraphQLString },
    commit: {
      type: commitType,
      args: {
        oid: { type: GraphQLString },
      },
      resolve(repo, args) {
        return repo.getCommit(args.oid);
      },
    },
  },
});

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      repository: {
        type: repoType,
        resolve() {
          return Git.Repository.open(REPO_DIR);
        },
      },
    },
  }),
});
