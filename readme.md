
# Funktionelle endpoints

 - __POST__ /auth/authenticate
 - __POST__ /auth/refresh
 - __GET__ /entries  
 Mangler "fulfillsTag" og "fulfillsRule".
 - __POST__ /entry  
 - __GET__ /user/current
 - __GET__ /user
 - __GET__ /user/__:userId__
 - __GET__ /user/__:userId__/locations
 - __GET__ /user/__:userId__/roles
 - __GET__ /user/__:userId__/permissions
 - __GET__ /timetag
 - __GET__ /timetag/__:timeTagId__
 - __GET__ /timetag/__:timeTagId__/rules  
 Sender tomt array selvom der ikke findes et TimeTag med det givne ID.
 - __GET__ /timetag/__:timeTagId__/rules/__:ruleId__
 - __GET__ /location
 - __GET__ /location/__:locationId__
 - __GET__ /location/__:locationId__/users
 - __GET__ /location/__:locationId__/leaders
 - __GET__ /role