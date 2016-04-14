import Git from 'nodegit';
import { GraphQLSchema,
         GraphQLString,
         GraphQLList,
         GraphQLObjectType } from 'graphql';

const REPO_DIR = process.env['REPO_DIR'] || console.error('Missing REPO_DIR env var') || process.exit(1);

const signatureType = new GraphQLObjectType({
  name: 'Signature',
  fields: {
    name: { type: GraphQLString },
    email: { type: GraphQLString },
  }
});

const treeEntryType = new GraphQLObjectType({
  name: 'TreeEntry',
  fields: {
    sha: { type: GraphQLString },
    path: { type: GraphQLString },
  }
});

const treeType = new GraphQLObjectType({
  name: 'Tree',
  fields: {
    id: { type: GraphQLString },
    path: { type: GraphQLString },
    entries: {
      type: new GraphQLList(treeEntryType),
      resolve(tree) {
        return tree.entries();
      }
    },
  },
});

const commitType = new GraphQLObjectType({
  name: 'Commit',
  fields() {
    return {
      date: {
        type: GraphQLString,
        resolve(commit) {
          return commit.date().toISOString();
        },
      },
      message: { type: GraphQLString },
      summary: { type: GraphQLString },
      author: { type: signatureType },
      committer: { type: signatureType },
      parents: {
        type: new GraphQLList(commitType),
        resolve(commit) {
          return commit.getParents();
        },
      },
      tree: {
        type: treeType,
        resolve(commit) {
          return commit.getTree();
        }
      }
    };
  },
});

const referenceType = new GraphQLObjectType({
  name: 'Reference',
  fields: {
    name: {
      type: GraphQLString,
      resolve(reference) {
        return reference.toString();
      },
    },
    commit: {
      type: commitType,
      resolve(reference) {
        return reference.owner().getReferenceCommit(reference);
      },
    },
  },
});

const repoType = new GraphQLObjectType({
  name: 'Repository',
  fields: {
    path: { type: GraphQLString },
    branch: {
      type: referenceType,
      args: {
        name: { type: GraphQLString },
      },
      resolve(repo, args) {
        return repo.getBranch(args.name);
      },
    },
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
      self: {
        type: repoType,
        resolve() {
          return Git.Repository.open(REPO_DIR);
        },
      },
    },
  }),
});
