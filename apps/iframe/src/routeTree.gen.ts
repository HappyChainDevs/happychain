/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from '@tanstack/react-router'

import { Route as rootRouteImport } from './routes/__root'
import { Route as RequestRouteImport } from './routes/request'

const EmbedLazyRouteImport = createFileRoute('/embed')()
const IndexLazyRouteImport = createFileRoute('/')()
const EmbedIndexLazyRouteImport = createFileRoute('/embed/')()
const EmbedSendLazyRouteImport = createFileRoute('/embed/send')()
const EmbedPermissionsIndexLazyRouteImport = createFileRoute(
  '/embed/permissions/',
)()
const EmbedPermissionsAppURLLazyRouteImport = createFileRoute(
  '/embed/permissions/$appURL',
)()

const EmbedLazyRoute = EmbedLazyRouteImport.update({
  id: '/embed',
  path: '/embed',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/embed.lazy').then((d) => d.Route))
const RequestRoute = RequestRouteImport.update({
  id: '/request',
  path: '/request',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/request.lazy').then((d) => d.Route))
const IndexLazyRoute = IndexLazyRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any).lazy(() => import('./routes/index.lazy').then((d) => d.Route))
const EmbedIndexLazyRoute = EmbedIndexLazyRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => EmbedLazyRoute,
} as any).lazy(() => import('./routes/embed/index.lazy').then((d) => d.Route))
const EmbedSendLazyRoute = EmbedSendLazyRouteImport.update({
  id: '/send',
  path: '/send',
  getParentRoute: () => EmbedLazyRoute,
} as any).lazy(() => import('./routes/embed/send.lazy').then((d) => d.Route))
const EmbedPermissionsIndexLazyRoute =
  EmbedPermissionsIndexLazyRouteImport.update({
    id: '/permissions/',
    path: '/permissions/',
    getParentRoute: () => EmbedLazyRoute,
  } as any).lazy(() =>
    import('./routes/embed/permissions/index.lazy').then((d) => d.Route),
  )
const EmbedPermissionsAppURLLazyRoute =
  EmbedPermissionsAppURLLazyRouteImport.update({
    id: '/permissions/$appURL',
    path: '/permissions/$appURL',
    getParentRoute: () => EmbedLazyRoute,
  } as any).lazy(() =>
    import('./routes/embed/permissions/$appURL.lazy').then((d) => d.Route),
  )

export interface FileRoutesByFullPath {
  '/': typeof IndexLazyRoute
  '/request': typeof RequestRoute
  '/embed': typeof EmbedLazyRouteWithChildren
  '/embed/send': typeof EmbedSendLazyRoute
  '/embed/': typeof EmbedIndexLazyRoute
  '/embed/permissions/$appURL': typeof EmbedPermissionsAppURLLazyRoute
  '/embed/permissions': typeof EmbedPermissionsIndexLazyRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexLazyRoute
  '/request': typeof RequestRoute
  '/embed/send': typeof EmbedSendLazyRoute
  '/embed': typeof EmbedIndexLazyRoute
  '/embed/permissions/$appURL': typeof EmbedPermissionsAppURLLazyRoute
  '/embed/permissions': typeof EmbedPermissionsIndexLazyRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexLazyRoute
  '/request': typeof RequestRoute
  '/embed': typeof EmbedLazyRouteWithChildren
  '/embed/send': typeof EmbedSendLazyRoute
  '/embed/': typeof EmbedIndexLazyRoute
  '/embed/permissions/$appURL': typeof EmbedPermissionsAppURLLazyRoute
  '/embed/permissions/': typeof EmbedPermissionsIndexLazyRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/request'
    | '/embed'
    | '/embed/send'
    | '/embed/'
    | '/embed/permissions/$appURL'
    | '/embed/permissions'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/request'
    | '/embed/send'
    | '/embed'
    | '/embed/permissions/$appURL'
    | '/embed/permissions'
  id:
    | '__root__'
    | '/'
    | '/request'
    | '/embed'
    | '/embed/send'
    | '/embed/'
    | '/embed/permissions/$appURL'
    | '/embed/permissions/'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexLazyRoute: typeof IndexLazyRoute
  RequestRoute: typeof RequestRoute
  EmbedLazyRoute: typeof EmbedLazyRouteWithChildren
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/embed': {
      id: '/embed'
      path: '/embed'
      fullPath: '/embed'
      preLoaderRoute: typeof EmbedLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/request': {
      id: '/request'
      path: '/request'
      fullPath: '/request'
      preLoaderRoute: typeof RequestRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexLazyRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/embed/': {
      id: '/embed/'
      path: '/'
      fullPath: '/embed/'
      preLoaderRoute: typeof EmbedIndexLazyRouteImport
      parentRoute: typeof EmbedLazyRoute
    }
    '/embed/send': {
      id: '/embed/send'
      path: '/send'
      fullPath: '/embed/send'
      preLoaderRoute: typeof EmbedSendLazyRouteImport
      parentRoute: typeof EmbedLazyRoute
    }
    '/embed/permissions/': {
      id: '/embed/permissions/'
      path: '/permissions'
      fullPath: '/embed/permissions'
      preLoaderRoute: typeof EmbedPermissionsIndexLazyRouteImport
      parentRoute: typeof EmbedLazyRoute
    }
    '/embed/permissions/$appURL': {
      id: '/embed/permissions/$appURL'
      path: '/permissions/$appURL'
      fullPath: '/embed/permissions/$appURL'
      preLoaderRoute: typeof EmbedPermissionsAppURLLazyRouteImport
      parentRoute: typeof EmbedLazyRoute
    }
  }
}

interface EmbedLazyRouteChildren {
  EmbedSendLazyRoute: typeof EmbedSendLazyRoute
  EmbedIndexLazyRoute: typeof EmbedIndexLazyRoute
  EmbedPermissionsAppURLLazyRoute: typeof EmbedPermissionsAppURLLazyRoute
  EmbedPermissionsIndexLazyRoute: typeof EmbedPermissionsIndexLazyRoute
}

const EmbedLazyRouteChildren: EmbedLazyRouteChildren = {
  EmbedSendLazyRoute: EmbedSendLazyRoute,
  EmbedIndexLazyRoute: EmbedIndexLazyRoute,
  EmbedPermissionsAppURLLazyRoute: EmbedPermissionsAppURLLazyRoute,
  EmbedPermissionsIndexLazyRoute: EmbedPermissionsIndexLazyRoute,
}

const EmbedLazyRouteWithChildren = EmbedLazyRoute._addFileChildren(
  EmbedLazyRouteChildren,
)

const rootRouteChildren: RootRouteChildren = {
  IndexLazyRoute: IndexLazyRoute,
  RequestRoute: RequestRoute,
  EmbedLazyRoute: EmbedLazyRouteWithChildren,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
