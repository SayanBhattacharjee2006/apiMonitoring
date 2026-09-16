export const ROLES = [
    'super-admin', 'client-admin', 'client-viewer'
]

export const CLIENT_ROLES = [
    'client-admin', 'client-viewer'
]

export const APPLICATION_ROLES = {
    SUPER_ADMIN : "super-admin",
    CLIENT_VIEWER : "client-viewer",
}

export const isValidClientRole = (role) => CLIENT_ROLES.includes(role);

export const isValidRole = (role) => ROLES.includes(role);