// Type definitions for API responses

export interface User {
  user: string // User ID
}

export interface Session {
  session: string // Session ID
}

export interface AssignedObject {
  _id: string;
  owner: string;
  object: string;
  title: string;
  description: string;
}

export interface CreateAssignedObjectResponse {
  assignedObject: string;
}

export interface Graph {
  _id: string;
  owner: string;
  title: string;
}

export interface GraphResponse {
  newGraph: string;
}

export interface AccessGraphResponse {
  accessedGraph: string;
}

export interface Node {
  _id: string;
  parent: string; // Graph ID
  title: string;
  enrichment: string; // Object ID
}

export interface Edge {
  _id: string;
  source: string; // Node ID
  target: string; // Node ID
  enrichment: string; // Object ID
}

export interface ResourceList {
  _id: string;
  title: string;
  owner: string;
  length: number;
}

export interface IndexedResource {
  _id: string;
  resource: string;
  title: string;
  list: string;
  index: number;
}

export interface Check {
  _id: string;
  user: string;
  object: string;
  checked: boolean;
}

export interface CreateResourceListResponse {
  newResourceList: string;
}

export interface AddNodeResponse {
  newNode: string;
}
