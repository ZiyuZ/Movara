# 使用示例

以下示例展示关键 API 的协作方式，供接口设计评审。方法与类型说明见[连接与会话](session.md)和[数据与控制](data-and-control.md)。场景文件由调用方提供，文件格式按场景接口确定。

## 同步控制

连接创建时自动登记控制订阅与预定义查询。`frames()` 接收已有订阅的数据，动作按一个回合一次提交。

```python
from movara import Action, Command, Query, launch


def run_scene(scene_path: str) -> None:
    vehicles = Query.objects(kind='vehicle')

    with launch(queries={'vehicles': vehicles}) as sim:
        sim.load_scene(scene_path)
        sim.run()

        for frame in sim.frames():
            if frame.tick >= 200:
                frame.submit(commands=[Command.pause()])
                break

            actions = [
                Action.acceleration(vehicle.id, -2.0)
                for vehicle in frame.data['vehicles']
                if vehicle.speed > 12.0
            ]
            frame.submit(actions=actions)
```

`launch` 默认打开 GUI。将 `headless=True` 传入入口即可采用无界面模式，两种模式使用相同的控制回合。

`frame.data['vehicles']` 是本地数据，遍历车辆保持本地操作。动作构造也发生在本地，最终批量提交。

每个车辆结果提供基础状态属性，例如 `vehicle.transform.position`、`vehicle.dimensions` 和 `vehicle.outline`。读取这些属性使用已收到的数据。

示例在指定的控制回合提交暂停请求，应用随后保持暂停。离开上下文会断开连接，GUI 和仿真现场保留以供检查。

## 动态补充查询

在已有帧对象上，可以根据预定义结果补充查询其他对象。下面查询较快车辆周围的行人，结果仍对应本回合的固定状态版本。

```python
from movara import Frame, Query, QueryResult


def inspect_nearby_pedestrians(frame: Frame) -> QueryResult | None:
    for vehicle in frame.data['vehicles']:
        if vehicle.speed > 12.0:
            return frame.query(
                Query.objects(
                    kind='pedestrian',
                    center=vehicle.transform.position,
                    radius=20.0,
                )
            )
    return None
```

`frame.query` 是一次明确的动态通信。后续遍历结果保持本地访问。查询完成后，调用方仍应提交该控制回合。

空间查询中的 `center` 使用世界坐标，`radius` 采用米。具体几何筛选参数随查询接口细化。

## 运行中修改查询

连接时注册的查询可以通过 `session.queries` 取得相应注册对象，采用与运行中新增查询相同的更新与取消方式。

```python
from movara import Query, Session


def update_vehicle_query(sim: Session) -> None:
    registration = sim.queries['vehicles']
    registration.update(
        Query.objects(kind='vehicle', center=(0.0, 0.0, 0.0), radius=50.0)
    )


def cancel_vehicle_query(sim: Session) -> None:
    sim.queries['vehicles'].cancel()
```

注册变更以应用确认的规则版本和边界为准。取消查询保持当前控制回合的提交义务。

## 持续观察

观察模式在连接时登记，应用持续运行。`updates()` 消费批量观察结果，适合监测和分析。

```python
from movara import Query, connect


def observe(endpoint: str, samples: int = 10) -> None:
    vehicles = Query.objects(kind='vehicle')

    with connect(endpoint, control=False, queries={'vehicles': vehicles}) as sim:
        for index, snapshot in enumerate(sim.updates()):
            print(snapshot.tick, snapshot.data['vehicles'])
            if index + 1 >= samples:
                break
```

离开观察上下文断开连接，应用按自身运行状态继续工作。精确的逐 Tick 条件判断与干预使用控制模式。

## 异常与退出

Python 控制代码发生未处理异常时，API 尽力向应用报告当前回合失败。连接断开或超时同样会导致必需回合失败，应用停止该次仿真并保留现场。

正常退出控制循环时，应提交当前回合并完成明确的暂停或结束流程。`close()` 负责断开，`shutdown()` 明确请求应用退出。

异步写法沿用同一套连接模式、数据版本与提交规则。异步入口和迭代形式在对应接口中细化。
