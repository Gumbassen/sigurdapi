/* eslint-disable no-use-before-define */
import express, { Router, RequestHandler } from 'express'
import log from './logger'
import { ApiRoutePath } from './ApiRoutes'
import auth from '../middlewares/auth'
import { EUserRolePermission } from './userpermissions'
import { HTTPMethod } from './HTTPMethod'
import nocache from 'nocache'


type TRouteConfigInsecureMethodsFactory<T> = {
    [method in keyof PrefixCamelCaseObjProps<HTTPMethod, 'Insecure'>]: (path: ApiRoutePath) => T
}

type TRouteConfigSecureMethodsFactory<T> = {
    [method in keyof PrefixCamelCaseObjProps<HTTPMethod, 'Secure'>]: (permission: EUserRolePermission, path: ApiRoutePath) => T
}

interface IRouteConfigFactory<T> extends TRouteConfigInsecureMethodsFactory<T>, TRouteConfigSecureMethodsFactory<T> {}

export class RouteConfig
{
    private method?: HTTPMethod
    private route?: ApiRoutePath
    private permission?: EUserRolePermission

    public constructor()
    {
        // Empty
    }

    public setMethod(method: HTTPMethod): this
    {
        this.method = method
        return this
    }

    public setRoute(route: ApiRoutePath): this
    {
        this.route = route
        return this
    }

    public setPermission(permission: EUserRolePermission | undefined): this
    {
        this.permission = permission
        return this
    }

    public hasMethod(): boolean
    {
        return typeof this.method !== 'undefined'
    }

    public hasRoute(): boolean
    {
        return typeof this.route !== 'undefined'
    }

    public hasPermission(): boolean
    {
        return typeof this.permission !== 'undefined'
    }

    public apply(router: Router, ...handlers: RequestHandler[]): void
    {
        if(!this.hasMethod())
            throw new Error('RouteSettings method is undefined')

        if(!this.hasRoute())
            throw new Error('RouteSettings route is undefined')

        const method = this.method!
        const route  = this.route!

        if(this.hasPermission())
        {
            auth.registerEndpointAccess(route, {
                method:     method,
                path:       route,
                permission: this.permission!,
            })
        }
        else
        {
            auth.registerInsecureEndpoint(route)
        }

        switch(method)
        {
            case HTTPMethod.POST:
                router.post(route, ...handlers)
                break

            case HTTPMethod.GET:
                router.get(route, ...handlers)
                break

            case HTTPMethod.PUT:
                router.put(route, ...handlers)
                break

            case HTTPMethod.DELETE:
                router.delete(route, ...handlers)
                break

            case HTTPMethod.PATCH:
                router.patch(route, ...handlers)
                break

            case HTTPMethod.OPTIONS:
                router.options(route, ...handlers)
                break

            case HTTPMethod.HEAD:
                router.head(route, ...handlers)
                break
        }
    }
}

interface IEndpointRouter {
    isLocked: () => boolean
}

interface ILockedEndpointRouter extends IEndpointRouter {
    isLocked: () => boolean
}

interface IUnlockedEndpointRouter<T extends IEndpointRouter> extends IEndpointRouter, IRouteConfigFactory<T> {
    isLocked: () => boolean
}

export interface EndpointRouterOptions {
    nocache: boolean
}

export class EndpointRouter implements IEndpointRouter
{
    protected router: Router
    protected unlocked: boolean

    public constructor(router: EndpointRouter, unlocked: boolean)
    public constructor(options: EndpointRouterOptions)
    public constructor(routerOrOptions: EndpointRouter | EndpointRouterOptions, unlocked?: boolean)
    {
        if(typeof unlocked === 'boolean')
        {
            // eslint-disable-next-line no-extra-parens
            this.router   = (routerOrOptions as EndpointRouter).router
            this.unlocked = unlocked
        }
        else
        {
            const options = routerOrOptions as EndpointRouterOptions

            this.router   = express.Router()
            this.unlocked = true

            if(options.nocache)
                this.router.use(nocache())
        }
    }

    public isLocked(): boolean
    {
        return this.unlocked
    }

    protected lockWithRouteConfig(config: RouteConfig): LockedEndpointRouter
    {
        if(!this.isLocked())
            throw new Error('EndpointRouter is already unlocked')

        return new LockedEndpointRouter(this, config)
    }

    protected getRouter(): Router
    {
        return this.router
    }
}

export class LockedEndpointRouter extends EndpointRouter implements ILockedEndpointRouter
{
    private handlers: RequestHandler[]
    private config: RouteConfig

    public constructor(endpointRouter: EndpointRouter, config: RouteConfig)
    {
        super(endpointRouter, false)
        this.config   = config
        this.handlers = []
    }

    public addHandler(handler: RequestHandler): this
    {
        this.handlers.push(handler)
        return this
    }

    public done(): UnlockedEndpointRouter
    {
        if(!this.handlers.length)
            throw new Error('At least one handler must be added before finishing configuration')

        this.config.apply(this.getRouter(), ...this.handlers)

        return new UnlockedEndpointRouter(this, true)
    }

    public getCurrentConfig(): RouteConfig
    {
        return this.config
    }
}

export class UnlockedEndpointRouter extends EndpointRouter implements IUnlockedEndpointRouter<LockedEndpointRouter>
{
    public constructor(router: EndpointRouter, unlocked: boolean)
    public constructor(options: EndpointRouterOptions)
    public constructor(routerOrOptions: EndpointRouter | EndpointRouterOptions, unlocked?: boolean)
    {
        if(typeof unlocked === 'boolean')
            super(routerOrOptions as EndpointRouter, unlocked)
        else
            super(routerOrOptions as EndpointRouterOptions)
    }

    public export(): Router
    {
        return this.getRouter()
    }

    public SecurePost(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.POST)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecureGet(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.GET)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecurePut(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.PUT)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecureDelete(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.DELETE)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecurePatch(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.PATCH)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecureOptions(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.OPTIONS)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public SecureHead(permission: EUserRolePermission, path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.HEAD)
                .setRoute(path)
                .setPermission(permission)
        )
    }

    public InsecurePost(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.POST)
                .setRoute(path)
        )
    }

    public InsecureGet(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.GET)
                .setRoute(path)
        )
    }

    public InsecurePut(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.PUT)
                .setRoute(path)
        )
    }

    public InsecureDelete(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.DELETE)
                .setRoute(path)
        )
    }

    public InsecurePatch(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.PATCH)
                .setRoute(path)
        )
    }

    public InsecureOptions(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.OPTIONS)
                .setRoute(path)
        )
    }

    public InsecureHead(path: ApiRoutePath): LockedEndpointRouter
    {
        return this.lockWithRouteConfig(
            new RouteConfig()
                .setMethod(HTTPMethod.HEAD)
                .setRoute(path)
        )
    }
}

export default function initialize(options: EndpointRouterOptions): UnlockedEndpointRouter
{
    return new UnlockedEndpointRouter(options)
}
