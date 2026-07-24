declare module "firebase-admin/app" {
  export function cert(credentials: Record<string, unknown>): unknown;
  export function getApps(): Array<unknown>;
  export function initializeApp(options: Record<string, unknown>): unknown;
}

declare module "firebase-admin/firestore" {
  type DocumentData = Record<string, any>;
  type DocumentSnapshot = { id: string; exists: boolean; data(): DocumentData | undefined };
  type QuerySnapshot = { empty: boolean; docs: DocumentSnapshot[] };
  type DocumentReference = {
    id: string;
    get(): Promise<DocumentSnapshot>;
    set(data: DocumentData): Promise<void>;
    update(data: DocumentData): Promise<void>;
  };
  type Query = {
    where(field: string, operator: string, value: unknown): Query;
    limit(value: number): Query;
    get(): Promise<QuerySnapshot>;
  };
  type CollectionReference = Query & {
    doc(id?: string): DocumentReference;
  };
  type WriteBatch = {
    set(ref: DocumentReference, data: DocumentData): WriteBatch;
    update(ref: DocumentReference, data: DocumentData): WriteBatch;
    commit(): Promise<void>;
  };
  type Firestore = {
    collection(name: string): CollectionReference;
    batch(): WriteBatch;
  };
  export function getFirestore(app?: unknown): Firestore;
}
