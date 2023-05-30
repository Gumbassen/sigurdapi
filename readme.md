
# Funktionelle endpoints

 - __POST__ /auth/authenticate
 - __POST__ /auth/refresh
 - __GET__ /entries  
 Mangler "fulfillsTag" og "fulfillsRule".
 - __POST__ /entry  
 - __GET__ /user/current
 - __GET__ /user
 - __GET__ /user/__{userId}__
 - __GET__ /user/__{userId}__/locations
 - __GET__ /user/__{userId}__/roles
 - __GET__ /user/__{userId}__/permissions
 - __GET__ /user/__{userId}__/tagcollections  
 Sender tomt array selvom der ikke findes en User med det givne ID.
 - __POST__ /user/__{userId}__/tagcollections
 - __GET__ /user/__{userId}__/tagcollections/__{collectionId}__
 - __DELETE__ /user/__{userId}__/tagcollections/__{collectionId}__
 - __GET__ /timetag
 - __GET__ /timetag/__{timeTagId}__
 - __GET__ /timetag/__{timeTagId}__/rules  
 Sender tomt array selvom der ikke findes et TimeTag med det givne ID.
 - __GET__ /timetag/__{timeTagId}__/rules/__{ruleId}__
 - __GET__ /location
 - __GET__ /location/__{locationId}__
 - __GET__ /location/__{locationId}__/users
 - __GET__ /location/__{locationId}__/leaders
 - __GET__ /role
 - __GET__ /role/__{roleId}__
 - __GET__ /role/__{roleId}__/permission
 - __GET__ /roles/permission
 - __GET__ /roles/permission/__{permissionId}__