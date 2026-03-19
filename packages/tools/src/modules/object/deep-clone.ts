/**
 * 检查是否为复杂数据类型（对象或数组）
 */
const isObject = (target: any): target is Record<string, any> => {
  return target !== null && (typeof target === 'object' || typeof target === 'function');
};

/**
 * 获取具体的数据类型标签
 */
const getType = (target: any): string => {
  return Object.prototype.toString.call(target);
};

/**
 * 工业级深拷贝函数
 * * @param target 要拷贝的目标数据
 * @param map 用于解决循环引用的 WeakMap (内部递归使用，外部调用无需传)
 * @returns 拷贝后的新数据
 */
export function deepClone<T>(target: T, map = new WeakMap<any, any>()): T {
  // 1. 基础类型和函数直接返回
  if (!isObject(target)) {
    return target;
  }

  // 2. 解决循环引用问题
  if (map.has(target)) {
    return map.get(target);
  }

  const type = getType(target);

  // 3. 处理不可遍历的特殊对象 (Date, RegExp 等)
  if (type === '[object Date]') {
    return new Date((target as unknown as Date).getTime()) as unknown as T;
  }
  if (type === '[object RegExp]') {
    const reg = target as unknown as RegExp;
    return new RegExp(reg.source, reg.flags) as unknown as T;
  }
  // 错误对象、包装对象等可以直接返回或做进一步特殊处理，这里选择直接返回
  if (type === '[object Error]' || type === '[object WeakMap]' || type === '[object WeakSet]') {
    return target;
  }

  // 4. 初始化可遍历对象 (Array, Object, Map, Set)
  let cloneTarget: any;

  if (type === '[object Array]') {
    cloneTarget = [] as any[];
  } else if (type === '[object Object]') {
    // 保持原型链继承
    cloneTarget = Object.create(Object.getPrototypeOf(target));
  } else if (type === '[object Map]') {
    cloneTarget = new Map();
  } else if (type === '[object Set]') {
    cloneTarget = new Set();
  } else {
    // 兜底：如果是其他未知对象，直接浅拷贝或返回
    return target;
  }

  // 核心：把当前对象存入 Map，必须在递归子元素之前执行！
  map.set(target, cloneTarget);

  // 5. 克隆 Set
  if (type === '[object Set]') {
    const setTarget = target as unknown as Set<any>;
    setTarget.forEach((value) => {
      cloneTarget.add(deepClone(value, map));
    });
    return cloneTarget;
  }

  // 6. 克隆 Map
  if (type === '[object Map]') {
    const mapTarget = target as unknown as Map<any, any>;
    mapTarget.forEach((value, key) => {
      // 注意：Map 的 key 也可能是对象，所以也要深拷贝
      cloneTarget.set(deepClone(key, map), deepClone(value, map));
    });
    return cloneTarget;
  }

  // 7. 克隆 Array 和 Object
  // 使用 Reflect.ownKeys 可以同时获取到字符串属性和 Symbol 属性
  const keys = Reflect.ownKeys(target as Record<string | symbol, any>);
  for (const key of keys) {
    cloneTarget[key] = deepClone((target as Record<string | symbol, any>)[key as string | symbol], map);
  }

  return cloneTarget;
}


/**
 * 测试深拷贝函数
 */
//   const onTest = () => {
//     const mockData: any = {
//       // 基础类型
//       num: 42,
//       str: 'Hello Front-End',
//       bool: true,
//       empty: null,
//       undef: undefined,
//       sym: Symbol('hiddenValue'),

//       // 特殊对象
//       date: new Date('2026-03-13T17:00:00.000Z'),
//       regExp: /match_me/gi,
//       error: new Error('A test error'),

//       // 函数 (通常保留引用即可)
//       sayHello: () => console.log('hello'),

//       // 数组与嵌套对象
//       arr: [1, 2, { nested: 'obj' }],

//       // 集合类型 (Set & Map)
//       mySet: new Set([1, 'text', { setObj: true }]),
//       myMap: new Map<any, any>([
//         ['simpleKey', 'simpleValue'],
//         [{ mapKey: 'obj' }, { mapValue: 'obj' }], // 测试对象作为键和值
//       ]),
//       // Symbol 作为键
//       [Symbol('hiddenKey')]: 'This value is accessed by Symbol',

//       // 预留循环引用字段
//       self: null,
//     };
//     const ceshidata = mockData;
//     const clone = deepClone(mockData);
//     console.log(clone, ceshidata === mockData, clone === mockData);
//   };