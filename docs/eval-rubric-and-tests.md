# Hackathon Eval Rubric And Test Cases

## Rubric

| Dimension | Points | Pass Signal |
| --- | ---: | --- |
| Innovation | 25 | The product is framed as a local-life execution Agent, not a search page. |
| Completeness | 25 | Natural-language input, planning, availability checks, confirmation, booking, sharing, tests, docs, and demo UI all exist. |
| Application Effect | 25 | Responses are natural, fast enough for demo, grounded in Mock data, and visibly use tools. |
| Business Value | 25 | The flow creates activity, restaurant, delivery, and reservation conversion opportunities. |

## Required E2E Cases

| Case | Input | Expected Output | Required Tools | Pass Standard |
| --- | --- | --- | --- | --- |
| Family happy path | 今天下午想带 5 岁孩子和老婆出去玩几个小时，老婆减肥，别太远 | 4-6 小时亲子 + 低卡餐饮方案，确认后生成预约和分享文案 | search_activities, search_restaurants, check_availability, get_route, book_activity, book_restaurant | Plan has 3+ items, at least 2 booking results, share text exists |
| Friends happy path | 今天下午 4 个朋友出去玩，2 男 2 女，想互动也要吃饭 | 朋友局互动活动 + 聚餐 + 过渡活动 | search_activities, search_restaurants, check_availability, get_route, book_activity, book_restaurant | Uses groupSize 4 and produces executable bookings |
| Restaurant full | 选择 r011 18:00 3 人 | Restaurant unavailable with alternative slots | check_availability, book_restaurant | Returns SLOT_UNAVAILABLE or a visible replacement path |
| Activity full | 选择同一活动的低库存时段 | Activity unavailable with alternative slots | check_availability, book_activity | Does not pretend success; proposes alternative |
| Too far | 用户要求 5km 内但候选超过 15km | Reject or explain distance conflict | search_activities, search_restaurants, get_route | Plan excludes far venue or marks conflict |
| Diet conflict | 老婆减肥，但推荐火锅/烧烤 | Explain conflict and switch to low-cal restaurant | search_restaurants, check_availability | Final restaurant is dietFriendly or conflict is explicit |
| Child age conflict | 5 岁孩子，但候选活动 minAge 8/12/14 | Reject unsuitable activity and replace | search_activities | Final activity ageSuitability accepts age 5 |
| Mock API failure | Booking API returns BOOKING_FAILED | Retry or degrade to manual booking with reason | book_activity/book_restaurant, search alternative | UI shows failure and fallback, not silent success |
