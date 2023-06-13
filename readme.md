
# Hvor er ting når jeg kører backenden?

Du kan altid se swagger på:
 - [127.0.0.1:6969/swagger](http://127.0.0.1:6969/swagger)

Selve API'en er tilgængelig på samme host ([127.0.0.1:6969](http://127.0.0.1:6969)).

~~WebSocket serveren er på [127.0.0.1:7070](ws://127.0.0.1:7070).  ~~ __Ikke alligevel__ 😅  
WebSocket serveren er på [ws://127.0.0.1:6969/ws](ws://127.0.0.1:6969/ws)

Det skal lige siges at, hvis din klient _kan_ bruge headere i din connection request, så brug authorization-headeren til at give din token.  
Ellers skal du sende en besked når forbindelsen er åbnet med dette indhold:
```JSON
{
  "type":  "action",
  "token": "[[DIN TOKEN]]",
}
```

Ellers får din klient ingen beskeder.

Husk at websockets kører på deres egen protokol, så der skal stå "ws://" foran, ikke "http://".

---

## OBS!
> Mange POST-requests er ikke beskrevet ordenligt i swagger.  
> F.eks. giver det ikke mening at man skal angive et ID når man opretter en Location.  
> CompanyId behøves aldrig sendes med, da den allerede er kendt gennem brugerens token.

---

# Funktionelle endpoints

Endpoints med _WS_ bliver også broadcasted til WebSocket serveren.

## Auth [_Finished_]
| WS | Method   | URL                | Comments |
|----|----------|--------------------|----------|
|    | __POST__ | /auth/authenticate |          |
|    | __POST__ | /auth/refresh      |          |

## Entry [__Finished__]
| WS | Method     | URL                           | Comments                                                           |
|----|------------|-------------------------------|--------------------------------------------------------------------|
|    | __GET__    | /entries                      | Mangler "fulfillsTag" og "fulfillsRule".                           |
| X  | __POST__   | /entry                        |                                                                    |
|    | __GET__    | /entry/__{entryId}__          |                                                                    |
| X  | __PUT__    | /entry/__{entryId}__          |                                                                    |
| X  | __DELETE__ | /entry/__{entryId}__          |                                                                    |
|    | __GET__    | /entry/__{entryId}__/messages | Sender tomt array selvom der ikke findes en User med det givne ID. |
| X  | __POST__   | /entry/__{entryId}__/messages |                                                                    |

## User [_Finished_]
| WS | Method     | URL                                                  | Comments                                                           |
|----|------------|------------------------------------------------------|--------------------------------------------------------------------|
|    | __GET__    | /users                                               |                                                                    |
|    | __GET__    | /user/current                                        |                                                                    |
|    | __GET__    | /user                                                |                                                                    |
| X  | __POST__   | /user                                                |                                                                    |
|    | __GET__    | /user/__{userId}__                                   |                                                                    |
| X  | __PUT__    | /user/__{userId}__                                   |                                                                    |
| X  | __DELETE__ | /user/__{userId}__                                   |                                                                    |
|    | __GET__    | /user/__{userId}__/locations                         |                                                                    |
|    | __GET__    | /user/__{userId}__/roles                             |                                                                    |
|    | __GET__    | /user/__{userId}__/permissions                       |                                                                    |
|    | __GET__    | /user/__{userId}__/tagcollections                    | Sender tomt array selvom der ikke findes en User med det givne ID. |
| X  | __POST__   | /user/__{userId}__/tagcollections                    |                                                                    |
|    | __GET__    | /user/__{userId}__/tagcollections/__{collectionId}__ |                                                                    |
| X  | __DELETE__ | /user/__{userId}__/tagcollections/__{collectionId}__ |                                                                    |

## Timetag [_Finished_]
| WS | Method     | URL                                         | Comments                                                              |
|----|------------|---------------------------------------------|-----------------------------------------------------------------------|
|    | __GET__    | /timetag                                    |                                                                       |
| X  | __POST__   | /timetag                                    |                                                                       |
|    | __GET__    | /timetag/__{timeTagId}__                    |                                                                       |
| X  | __PUT__    | /timetag/__{timeTagId}__                    |                                                                       |
| X  | __DELETE__ | /timetag/__{timeTagId}__                    |                                                                       |
|    | __GET__    | /timetag/__{timeTagId}__/rules              | Sender tomt array selvom der ikke findes et TimeTag med det givne ID. |
| X  | __POST__   | /timetag/__{timeTagId}__/rules              |                                                                       |
|    | __GET__    | /timetag/__{timeTagId}__/rules/__{ruleId}__ |                                                                       |
| X  | __DELETE__ | /timetag/__{timeTagId}__/rules/__{ruleId}__ |                                                                       |

## Location [_Finished_]
| WS | Method     | URL                                               | Comments |
|----|------------|---------------------------------------------------|----------|
|    | __GET__    | /location                                         |          |
| X  | __POST__   | /location                                         |          |
|    | __GET__    | /location/__{locationId}__                        |          |
| X  | __PUT__    | /location/__{locationId}__                        |          |
| X  | __DELETE__ | /location/__{locationId}__                        |          |
|    | __GET__    | /location/__{locationId}__/users                  |          |
|    | __GET__    | /location/__{locationId}__/leaders                |          |
|    | __POST__   | /location/__{locationId}__/leaders/__{leaderId}__ |          |
|    | __DELETE__ | /location/__{locationId}__/leaders/__{leaderId}__ |          |

## Role [_Finished_]
| WS | Method     | URL                                              | Comments |
|----|------------|--------------------------------------------------|----------|
|    | __GET__    | /role                                            |          |
| X  | __POST__   | /role                                            |          |
|    | __GET__    | /role/__{roleId}__                               |          |
| X  | __PUT__    | /role/__{roleId}__                               |          |
| X  | __DELETE__ | /role/__{roleId}__                               |          |
|    | __GET__    | /role/__{roleId}__/permission                    |          |
|    | __POST__   | /role/__{roleId}__/permission/__{permissionId}__ |          |
|    | __DELETE__ | /role/__{roleId}__/permission/__{permissionId}__ |          |
|    | __GET__    | /roles/permission                                |          |
|    | __GET__    | /roles/permission/__{permissionId}__             |          |

## Entrytype
| WS | Method     | URL                              | Comments |
|----|------------|----------------------------------|----------|
|    | __GET__    | /entrytype                       |          |
|    | __GET__    | /entrytype/__{timeEntryTypeId}__ |          |
| X  | __DELETE__ | /entrytype/__{timeEntryTypeId}__ |          |