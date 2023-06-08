
## OBS!
> Mange POST-requests er ikke beskrevet ordenligt i swagger.  
> F.eks. giver det ikke mening at man skal angive et ID når man opretter en Location.  
> CompanyId behøves aldrig sendes med, da den allerede er kendt gennem brugerens token.

---

# Funktionelle endpoints

## Auth
 - __[POST]__ /auth/authenticate
 - __[POST]__ /auth/refresh

## Entry
 - __[GET]__ /entries  
 Mangler "fulfillsTag" og "fulfillsRule".
 - __[POST]__ /entry
 - __[GET]__ /entry/__{entryId}__
 - __[GET]__ /entry/__{entryId}__/messages  
   Sender tomt array selvom der ikke findes en User med det givne ID.
 - __[POST]__ /entry/__{entryId}__/messages

## User
 - __[GET]__ /users
 - __[GET]__ /user/current
 - __[GET]__ /user
 - __[POST]__ /user
 - __[GET]__ /user/__{userId}__
 - __[PUT]__ /user/__{userId}__
 - __[DELETE]__ /user/__{userId}__
 - __[GET]__ /user/__{userId}__/locations
 - __[GET]__ /user/__{userId}__/roles
 - __[GET]__ /user/__{userId}__/permissions
 - __[GET]__ /user/__{userId}__/tagcollections  
 Sender tomt array selvom der ikke findes en User med det givne ID.
 - __[POST]__ /user/__{userId}__/tagcollections
 - __[GET]__ /user/__{userId}__/tagcollections/__{collectionId}__
 - __[DELETE]__ /user/__{userId}__/tagcollections/__{collectionId}__

## Timetag
 - __[GET]__ /timetag
 - __[POST]__ /timetag
 - __[GET]__ /timetag/__{timeTagId}__
 - __[DELETE]__ /timetag/__{timeTagId}__
 - __[GET]__ /timetag/__{timeTagId}__/rules  
 Sender tomt array selvom der ikke findes et TimeTag med det givne ID.
 - __[POST]__ /timetag/__{timeTagId}__/rules  
 - __[GET]__ /timetag/__{timeTagId}__/rules/__{ruleId}__
 - __[DELETE]__ /timetag/__{timeTagId}__/rules/__{ruleId}__

## Location
 - __[GET]__ /location
 - __[GET]__ /location/__{locationId}__
 - __[GET]__ /location/__{locationId}__/users
 - __[GET]__ /location/__{locationId}__/leaders

## Role
 - __[GET]__ /role
 - __[POST]__ /role
 - __[GET]__ /role/__{roleId}__
 - __[PUT]__ /role/__{roleId}__
 - __[DELETE]__ /role/__{roleId}__
 - __[GET]__ /role/__{roleId}__/permission
 - __[POST]__ /role/__{roleId}__/permission/__{permissionId}__
 - __[DELETE]__ /role/__{roleId}__/permission/__{permissionId}__
 - __[GET]__ /roles/permission
 - __[GET]__ /roles/permission/__{permissionId}__
