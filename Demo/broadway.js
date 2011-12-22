var arguments_ = [], ENVIRONMENT_IS_NODE = typeof process === "object", ENVIRONMENT_IS_WEB = typeof window === "object", ENVIRONMENT_IS_WORKER = typeof importScripts === "function", ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if(ENVIRONMENT_IS_NODE) {
  print = function(a) {
    process.stdout.write(a + "\n")
  };
  printErr = function(a) {
    process.stderr.write(a + "\n")
  };
  var nodeFS = require("fs");
  read = function(a) {
    var b = nodeFS.readFileSync(a).toString();
    !b && a[0] != "/" && (a = __dirname.split("/").slice(0, -1).join("/") + "/src/" + a, b = nodeFS.readFileSync(a).toString());
    return b
  };
  arguments_ = process.argv.slice(2)
}else {
  if(ENVIRONMENT_IS_SHELL) {
    this.read || (read = function(a) {
      snarf(a)
    }), arguments_ = this.arguments ? arguments : scriptArgs
  }else {
    if(ENVIRONMENT_IS_WEB) {
      printErr = function(a) {
        console.log(a)
      }, read = function(a) {
        var b = new XMLHttpRequest;
        b.open("GET", a, false);
        b.send(null);
        return b.responseText
      }, this.arguments && (arguments_ = arguments)
    }else {
      if(ENVIRONMENT_IS_WORKER) {
        load = importScripts
      }else {
        throw"Unknown runtime environment. Where are we?";
      }
    }
  }
}
function globalEval(a) {
  eval.call(null, a)
}
typeof load == "undefined" && typeof read != "undefined" && (load = function(a) {
  globalEval(read(a))
});
typeof printErr === "undefined" && (printErr = function() {
});
typeof print === "undefined" && (print = printErr);
try {
  this.Module = Module
}catch(e$$5) {
  this.Module = Module = {}
}
if(!Module.arguments) {
  Module.arguments = arguments_
}
var Runtime = {stackSave:function() {
  return STACKTOP
}, stackRestore:function(a) {
  STACKTOP = a
}, forceAlign:function(a, b) {
  b = b || 4;
  return isNumber(a) && isNumber(b) ? Math.ceil(a / b) * b : "Math.ceil((" + a + ")/" + b + ")*" + b
}, isNumberType:function(a) {
  return a in Runtime.INT_TYPES || a in Runtime.FLOAT_TYPES
}, isPointerType:function(a) {
  return a[a.length - 1] == "*"
}, isStructType:function(a) {
  return isPointerType(a) ? false : /^\[\d+\ x\ (.*)\]/.test(a) ? true : /<?{ [^}]* }>?/.test(a) ? true : a[0] == "%"
}, INT_TYPES:{i1:0, i8:0, i16:0, i32:0, i64:0}, FLOAT_TYPES:{"float":0, "double":0}, or64:function(a, b) {
  var c = a | 0 | b | 0, d = (Math.round(a / 4294967296) | Math.round(b / 4294967296)) * 4294967296;
  return c + d
}, and64:function(a, b) {
  var c = (a | 0) & (b | 0), d = (Math.round(a / 4294967296) & Math.round(b / 4294967296)) * 4294967296;
  return c + d
}, xor64:function(a, b) {
  var c = (a | 0) ^ (b | 0), d = (Math.round(a / 4294967296) ^ Math.round(b / 4294967296)) * 4294967296;
  return c + d
}, getNativeTypeSize:function(a) {
  if(Runtime.QUANTUM_SIZE == 1) {
    return 1
  }
  var b = {"%i1":1, "%i8":1, "%i16":2, "%i32":4, "%i64":8, "%float":4, "%double":8}["%" + a];
  if(!b && a[a.length - 1] == "*") {
    b = Runtime.QUANTUM_SIZE
  }
  return b
}, getNativeFieldSize:function(a) {
  return Math.max(Runtime.getNativeTypeSize(a), Runtime.QUANTUM_SIZE)
}, dedup:function(a, b) {
  var c = {};
  return b ? a.filter(function(a) {
    return c[a[b]] ? false : c[a[b]] = true
  }) : a.filter(function(a) {
    return c[a] ? false : c[a] = true
  })
}, set:function() {
  for(var a = typeof arguments[0] === "object" ? arguments[0] : arguments, b = {}, c = 0;c < a.length;c++) {
    b[a[c]] = 0
  }
  return b
}, calculateStructAlignment:function(a) {
  a.flatSize = 0;
  a.alignSize = 0;
  var b = [], c = -1;
  a.flatIndexes = a.fields.map(function(d) {
    var e;
    if(Runtime.isNumberType(d) || Runtime.isPointerType(d)) {
      d = e = Runtime.getNativeTypeSize(d)
    }else {
      if(Runtime.isStructType(d)) {
        e = Types.types[d].flatSize, d = Types.types[d].alignSize
      }else {
        throw"Unclear type in struct: " + d + ", in " + a.name_ + " :: " + dump(Types.types[a.name_]);
      }
    }
    d = a.packed ? 1 : Math.min(d, Runtime.QUANTUM_SIZE);
    a.alignSize = Math.max(a.alignSize, d);
    d = Runtime.alignMemory(a.flatSize, d);
    a.flatSize = d + e;
    c >= 0 && b.push(d - c);
    return c = d
  });
  a.flatSize = Runtime.alignMemory(a.flatSize, a.alignSize);
  if(b.length == 0) {
    a.flatFactor = a.flatSize
  }else {
    if(Runtime.dedup(b).length == 1) {
      a.flatFactor = b[0]
    }
  }
  a.needsFlattening = a.flatFactor != 1;
  return a.flatIndexes
}, generateStructInfo:function(a, b, c) {
  var d, e;
  if(b) {
    c = c || 0;
    d = (typeof Types === "undefined" ? Runtime.typeInfo : Types.types)[b];
    if(!d) {
      return null
    }
    a || (a = (typeof Types === "undefined" ? Runtime : Types).structMetadata[b.replace(/.*\./, "")]);
    if(!a) {
      return null
    }
    assert(d.fields.length === a.length, "Number of named fields must match the type for " + b + ". Perhaps due to inheritance, which is not supported yet?");
    e = d.flatIndexes
  }else {
    d = {fields:a.map(function(a) {
      return a[0]
    })}, e = Runtime.calculateStructAlignment(d)
  }
  var f = {__size__:d.flatSize};
  b ? a.forEach(function(a, b) {
    if(typeof a === "string") {
      f[a] = e[b] + c
    }else {
      var j, l;
      for(l in a) {
        j = l
      }
      f[j] = Runtime.generateStructInfo(a[j], d.fields[b], e[b])
    }
  }) : a.forEach(function(a, b) {
    f[a[1]] = e[b]
  });
  return f
}, stackAlloc:function(a) {
  var b = STACKTOP;
  STACKTOP += a;
  STACKTOP = Math.ceil(STACKTOP / 4) * 4;
  return b
}, staticAlloc:function(a) {
  var b = STATICTOP;
  STATICTOP += a;
  STATICTOP = Math.ceil(STATICTOP / 4) * 4;
  STATICTOP >= TOTAL_MEMORY && enlargeMemory();
  return b
}, alignMemory:function(a, b) {
  return Math.ceil(a / (b ? b : 4)) * (b ? b : 4)
}, QUANTUM_SIZE:4, __dummy__:0}, CorrectionsMonitor = {MAX_ALLOWED:0, corrections:0, sigs:{}, note:function(a, b) {
  b || (this.corrections++, this.corrections >= this.MAX_ALLOWED && abort("\n\nToo many corrections!"))
}, print:function() {
  var a = [], b;
  for(b in this.sigs) {
    a.push({sig:b, fails:this.sigs[b][0], succeeds:this.sigs[b][1], total:this.sigs[b][0] + this.sigs[b][1]})
  }
  a.sort(function(a, b) {
    return b.total - a.total
  });
  for(b = 0;b < a.length;b++) {
    var c = a[b];
    print(c.sig + " : " + c.total + " hits, %" + Math.ceil(100 * c.fails / c.total) + " failures")
  }
}}, __globalConstructor__ = function() {
}, __THREW__ = false, __ATEXIT__ = [], ABORT = false, undef = 0, tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempI64, tempI64b, tempDoubleBuffer = new ArrayBuffer(8), tempDoubleI32 = new Int32Array(tempDoubleBuffer), tempDoubleF64 = new Float64Array(tempDoubleBuffer);
function abort(a) {
  print(a + ":\n" + Error().stack);
  ABORT = true;
  throw"Assertion: " + a;
}
function assert(a, b) {
  a || abort("Assertion failed: " + b)
}
function setValue(a, b, c) {
  c = c || "i8";
  c[c.length - 1] === "*" && (c = "i32");
  switch(c) {
    case "i1":
      HEAP8[a] = b;
      break;
    case "i8":
      HEAP8[a] = b;
      break;
    case "i16":
      HEAP16[a >> 1] = b;
      break;
    case "i32":
      HEAP32[a >> 2] = b;
      break;
    case "i64":
      HEAP32[a >> 2] = b[0];
      HEAP32[a + 4 >> 2] = b[1];
      break;
    case "float":
      HEAPF32[a >> 2] = b;
      break;
    case "double":
      tempDoubleF64[0] = b;
      HEAP32[a >> 2] = tempDoubleI32[0];
      HEAP32[a + 4 >> 2] = tempDoubleI32[1];
      break;
    default:
      abort("invalid type for setValue: " + c)
  }
}
Module.setValue = setValue;
function getValue(a, b) {
  b = b || "i8";
  b[b.length - 1] === "*" && (b = "i32");
  switch(b) {
    case "i1":
      return HEAP8[a];
    case "i8":
      return HEAP8[a];
    case "i16":
      return HEAP16[a >> 1];
    case "i32":
      return HEAP32[a >> 2];
    case "i64":
      return[HEAPU32[a >> 2], HEAPU32[a + 4 >> 2]];
    case "float":
      return HEAPF32[a >> 2];
    case "double":
      return tempDoubleI32[0] = HEAP32[a >> 2], tempDoubleI32[1] = HEAP32[a + 4 >> 2], tempDoubleF64[0];
    default:
      abort("invalid type for setValue: " + b)
  }
  return null
}
Module.getValue = getValue;
var ALLOC_NORMAL = 0, ALLOC_STACK = 1, ALLOC_STATIC = 2;
Module.ALLOC_NORMAL = ALLOC_NORMAL;
Module.ALLOC_STACK = ALLOC_STACK;
Module.ALLOC_STATIC = ALLOC_STATIC;
function allocate(a, b, c) {
  var d, e;
  typeof a === "number" ? (d = true, e = a) : (d = false, e = a.length);
  for(var f = typeof b === "string" ? b : null, c = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc][c === void 0 ? ALLOC_STATIC : c](Math.max(e, f ? 1 : b.length)), g = 0, h;g < e;) {
    var j = d ? 0 : a[g];
    typeof j === "function" && (j = Runtime.getFunctionIndex(j));
    h = f || b[g];
    h === 0 ? g++ : (h == "i64" && (h = "i32"), setValue(c + g, j, h), g += Runtime.getNativeTypeSize(h))
  }
  return c
}
Module.allocate = allocate;
function Pointer_stringify(a) {
  for(var b = "", c = 0, d, e = String.fromCharCode(0);;) {
    d = String.fromCharCode(HEAPU8[a + c]);
    if(d == e) {
      break
    }
    b += d;
    c += 1
  }
  return b
}
Module.Pointer_stringify = Pointer_stringify;
function Array_stringify(a) {
  for(var b = "", c = 0;c < a.length;c++) {
    b += String.fromCharCode(a[c])
  }
  return b
}
Module.Array_stringify = Array_stringify;
var FUNCTION_TABLE, PAGE_SIZE = 4096;
function alignMemoryPage(a) {
  return Math.ceil(a / PAGE_SIZE) * PAGE_SIZE
}
var HEAP, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, STACK_ROOT, STACKTOP, STACK_MAX, STATICTOP;
function enlargeMemory() {
  for(;TOTAL_MEMORY <= STATICTOP;) {
    TOTAL_MEMORY = alignMemoryPage(TOTAL_MEMORY * 1.25)
  }
  var a = HEAP8, b = new ArrayBuffer(TOTAL_MEMORY);
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAP8.set(a)
}
var TOTAL_MEMORY = Module.TOTAL_MEMORY || 52428800, FAST_MEMORY = Module.FAST_MEMORY || 12582912;
assert(!!Int32Array && !!Float64Array && !!(new Int32Array(1)).subarray && !!(new Int32Array(1)).set, "Cannot fallback to non-typed array case: Code is too specialized");
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
var base = intArrayFromString("(null)");
STATICTOP = base.length;
for(var i = 0;i < base.length;i++) {
  HEAP8[i] = base[i]
}
Module.HEAP = HEAP;
Module.HEAP8 = HEAP8;
Module.HEAP16 = HEAP16;
Module.HEAP32 = HEAP32;
Module.HEAPU8 = HEAPU8;
Module.HEAPU16 = HEAPU16;
Module.HEAPU32 = HEAPU32;
Module.HEAPF32 = HEAPF32;
STACK_ROOT = STACKTOP = alignMemoryPage(10);
var TOTAL_STACK = 1048576;
STACK_MAX = STACK_ROOT + TOTAL_STACK;
STATICTOP = alignMemoryPage(STACK_MAX);
function __shutdownRuntime__() {
  for(;__ATEXIT__.length > 0;) {
    var a = __ATEXIT__.pop(), b = a.func;
    typeof b === "number" && (b = FUNCTION_TABLE[b]);
    b(a.arg === void 0 ? null : a.arg)
  }
  CorrectionsMonitor.print()
}
function Array_copy(a, b) {
  return Array.prototype.slice.call(HEAP8.subarray(a, a + b))
}
Module.Array_copy = Array_copy;
function String_len(a) {
  for(var b = 0;HEAP8[a + b];) {
    b++
  }
  return b
}
Module.String_len = String_len;
function String_copy(a, b) {
  var c = String_len(a);
  b && c++;
  var d = Array_copy(a, c);
  b && (d[c - 1] = 0);
  return d
}
Module.String_copy = String_copy;
function intArrayFromString(a, b) {
  for(var c = [], d = 0;d < a.length;) {
    var e = a.charCodeAt(d);
    e > 255 && (e &= 255);
    c.push(e);
    d += 1
  }
  b || c.push(0);
  return c
}
Module.intArrayFromString = intArrayFromString;
function intArrayToString(a) {
  for(var b = [], c = 0;c < a.length;c++) {
    var d = a[c];
    d > 255 && (d &= 255);
    b.push(String.fromCharCode(d))
  }
  return b.join("")
}
Module.intArrayToString = intArrayToString;
function unSign(a, b) {
  return a >= 0 ? a : b <= 32 ? 2 * Math.abs(1 << b - 1) + a : Math.pow(2, b) + a
}
function reSign(a, b) {
  if(a <= 0) {
    return a
  }
  var c = b <= 32 ? Math.abs(1 << b - 1) : Math.pow(2, b - 1);
  if(a >= c && (b <= 32 || a > c)) {
    a = -2 * c + a
  }
  return a
}
function _h264bsdProcessBlock(a, b, c, d) {
  var e, f, g, h, j, l, k;
  f = HEAPU8[_qpDiv6 + b];
  g = HEAP32[_levelScale + HEAPU8[_qpMod6 + b] * 12 >> 2] << f;
  h = HEAP32[_levelScale + HEAPU8[_qpMod6 + b] * 12 + 4 >> 2] << f;
  b = HEAP32[_levelScale + HEAPU8[_qpMod6 + b] * 12 + 8 >> 2] << f;
  (c != 0 ? 2 : 1) == 1 && (HEAP32[a >> 2] *= g);
  c = (d & 65436) != 0 ? 3 : 17;
  a:do {
    if(c == 3) {
      j = HEAP32[a + 4 >> 2];
      l = HEAP32[a + 56 >> 2];
      k = HEAP32[a + 60 >> 2];
      HEAP32[a + 4 >> 2] = j * h;
      HEAP32[a + 56 >> 2] = l * h;
      HEAP32[a + 60 >> 2] = k * b;
      j = HEAP32[a + 8 >> 2];
      l = HEAP32[a + 20 >> 2];
      k = HEAP32[a + 16 >> 2];
      HEAP32[a + 16 >> 2] = j * h;
      HEAP32[a + 8 >> 2] = l * g;
      HEAP32[a + 20 >> 2] = k * b;
      j = HEAP32[a + 32 >> 2];
      l = HEAP32[a + 12 >> 2];
      k = HEAP32[a + 24 >> 2];
      f = j * h;
      HEAP32[a + 32 >> 2] = l * g;
      HEAP32[a + 12 >> 2] = k * h;
      j = HEAP32[a + 28 >> 2];
      l = HEAP32[a + 48 >> 2];
      k = HEAP32[a + 36 >> 2];
      HEAP32[a + 24 >> 2] = j * h;
      HEAP32[a + 28 >> 2] = l * b;
      HEAP32[a + 48 >> 2] = k * h;
      HEAP32[a + 36 >> 2] = f;
      j = HEAP32[a + 40 >> 2];
      l = HEAP32[a + 44 >> 2];
      k = HEAP32[a + 52 >> 2];
      HEAP32[a + 52 >> 2] = j * b;
      HEAP32[a + 40 >> 2] = l * g;
      HEAP32[a + 44 >> 2] = k * h;
      j = 4;
      l = a;
      b:for(;;) {
        f = j;
        j = f - 1;
        if(f == 0) {
          c = 7;
          break b
        }
        f = HEAP32[l >> 2] + HEAP32[l + 8 >> 2];
        g = HEAP32[l >> 2] - HEAP32[l + 8 >> 2];
        h = (HEAP32[l + 4 >> 2] >> 1) - HEAP32[l + 12 >> 2];
        b = HEAP32[l + 4 >> 2] + (HEAP32[l + 12 >> 2] >> 1);
        HEAP32[l >> 2] = f + b;
        HEAP32[l + 4 >> 2] = g + h;
        HEAP32[l + 8 >> 2] = g - h;
        HEAP32[l + 12 >> 2] = f - b;
        l += 16
      }
      j = 4;
      b:for(;;) {
        f = j;
        j = f - 1;
        if(f == 0) {
          c = 16;
          break b
        }
        f = HEAP32[a >> 2] + HEAP32[a + 32 >> 2];
        g = HEAP32[a >> 2] - HEAP32[a + 32 >> 2];
        h = (HEAP32[a + 16 >> 2] >> 1) - HEAP32[a + 48 >> 2];
        b = HEAP32[a + 16 >> 2] + (HEAP32[a + 48 >> 2] >> 1);
        HEAP32[a >> 2] = b + (f + 32) >> 6;
        HEAP32[a + 16 >> 2] = h + (g + 32) >> 6;
        HEAP32[a + 32 >> 2] = g - h + 32 >> 6;
        HEAP32[a + 48 >> 2] = f - b + 32 >> 6;
        if(HEAP32[a >> 2] + 512 > 1023) {
          c = 13;
          break b
        }
        if(HEAP32[a + 16 >> 2] + 512 > 1023) {
          c = 13;
          break b
        }
        if(HEAP32[a + 32 >> 2] + 512 > 1023) {
          c = 13;
          break b
        }
        if(HEAP32[a + 48 >> 2] + 512 > 1023) {
          c = 13;
          break b
        }
        a += 4
      }
      do {
        if(c == 16) {
          c = 28;
          break a
        }else {
          if(c == 13) {
            e = 1;
            c = 29;
            break a
          }
        }
      }while(0)
    }else {
      if(c == 17) {
        c = (d & 98) == 0 ? 18 : 21;
        b:do {
          if(c == 18) {
            f = HEAP32[a >> 2] + 32 >> 6;
            c = f + 512 > 1023 ? 19 : 20;
            do {
              if(c == 19) {
                e = 1;
                c = 29;
                break a
              }else {
                c == 20 && (d = f, HEAP32[a + 60 >> 2] = d, HEAP32[a + 56 >> 2] = d, HEAP32[a + 52 >> 2] = d, HEAP32[a + 48 >> 2] = d, HEAP32[a + 44 >> 2] = d, HEAP32[a + 40 >> 2] = d, HEAP32[a + 36 >> 2] = d, HEAP32[a + 32 >> 2] = d, HEAP32[a + 28 >> 2] = d, HEAP32[a + 24 >> 2] = d, HEAP32[a + 20 >> 2] = d, HEAP32[a + 16 >> 2] = d, HEAP32[a + 12 >> 2] = d, HEAP32[a + 8 >> 2] = d, HEAP32[a + 4 >> 2] = d, HEAP32[a >> 2] = d)
              }
            }while(0)
          }else {
            if(c == 21) {
              HEAP32[a + 4 >> 2] *= h;
              HEAP32[a + 8 >> 2] = HEAP32[a + 20 >> 2] * g;
              HEAP32[a + 12 >> 2] = HEAP32[a + 24 >> 2] * h;
              f = HEAP32[a >> 2] + HEAP32[a + 8 >> 2];
              g = HEAP32[a >> 2] - HEAP32[a + 8 >> 2];
              h = (HEAP32[a + 4 >> 2] >> 1) - HEAP32[a + 12 >> 2];
              b = HEAP32[a + 4 >> 2] + (HEAP32[a + 12 >> 2] >> 1);
              HEAP32[a >> 2] = b + (f + 32) >> 6;
              HEAP32[a + 4 >> 2] = h + (g + 32) >> 6;
              HEAP32[a + 8 >> 2] = g - h + 32 >> 6;
              HEAP32[a + 12 >> 2] = f - b + 32 >> 6;
              d = HEAP32[a >> 2];
              HEAP32[a + 48 >> 2] = d;
              HEAP32[a + 32 >> 2] = d;
              HEAP32[a + 16 >> 2] = d;
              d = HEAP32[a + 4 >> 2];
              HEAP32[a + 52 >> 2] = d;
              HEAP32[a + 36 >> 2] = d;
              HEAP32[a + 20 >> 2] = d;
              d = HEAP32[a + 8 >> 2];
              HEAP32[a + 56 >> 2] = d;
              HEAP32[a + 40 >> 2] = d;
              HEAP32[a + 24 >> 2] = d;
              d = HEAP32[a + 12 >> 2];
              HEAP32[a + 60 >> 2] = d;
              HEAP32[a + 44 >> 2] = d;
              HEAP32[a + 28 >> 2] = d;
              c = HEAP32[a >> 2] + 512 > 1023 ? 25 : 22;
              c:do {
                if(c == 22) {
                  if(HEAP32[a + 4 >> 2] + 512 > 1023) {
                    break c
                  }
                  if(HEAP32[a + 8 >> 2] + 512 > 1023) {
                    break c
                  }
                  if(HEAP32[a + 12 >> 2] + 512 > 1023) {
                    break c
                  }
                  break b
                }
              }while(0);
              e = 1;
              c = 29;
              break a
            }
          }
        }while(0);
        c = 28;
        break a
      }
    }
  }while(0);
  c == 28 && (e = 0);
  return e
}
_h264bsdProcessBlock.X = 1;
function _h264bsdCountLeadingZeros(a, b) {
  var c, d, e;
  d = 0;
  e = 1 << b - 1;
  a:for(;;) {
    if(e != 0) {
      c = 2
    }else {
      var f = 0;
      c = 3
    }
    c == 2 && (f = (a & e) != 0 ^ 1);
    if(!f) {
      break a
    }
    d += 1;
    e >>>= 1
  }
  return d
}
function _abs(a) {
  var b;
  b = a < 0 ? 1 : 2;
  if(b == 1) {
    var c = -a
  }else {
    b == 2 && (c = a)
  }
  return c
}
function _clip(a, b, c) {
  var d;
  d = c < a ? 1 : 2;
  if(d == 1) {
    var e = a
  }else {
    if(d == 2) {
      d = c > b ? 3 : 4;
      if(d == 3) {
        var f = b
      }else {
        d == 4 && (f = c)
      }
      e = f
    }
  }
  return e
}
function _h264bsdProcessLumaDc(a, b) {
  var c, d, e, f, g, h, j, l, k, m;
  d = a;
  j = HEAPU8[_qpMod6 + b];
  l = HEAPU8[_qpDiv6 + b];
  e = HEAP32[d + 8 >> 2];
  HEAP32[d + 8 >> 2] = HEAP32[d + 20 >> 2];
  HEAP32[d + 20 >> 2] = HEAP32[d + 16 >> 2];
  HEAP32[d + 16 >> 2] = e;
  e = HEAP32[d + 32 >> 2];
  HEAP32[d + 32 >> 2] = HEAP32[d + 12 >> 2];
  HEAP32[d + 12 >> 2] = HEAP32[d + 24 >> 2];
  HEAP32[d + 24 >> 2] = HEAP32[d + 28 >> 2];
  HEAP32[d + 28 >> 2] = HEAP32[d + 48 >> 2];
  HEAP32[d + 48 >> 2] = HEAP32[d + 36 >> 2];
  HEAP32[d + 36 >> 2] = e;
  e = HEAP32[d + 40 >> 2];
  HEAP32[d + 40 >> 2] = HEAP32[d + 44 >> 2];
  HEAP32[d + 44 >> 2] = HEAP32[d + 52 >> 2];
  HEAP32[d + 52 >> 2] = e;
  c = 4;
  k = d;
  a:for(;;) {
    e = c;
    c = e - 1;
    if(e == 0) {
      break a
    }
    e = HEAP32[k >> 2] + HEAP32[k + 8 >> 2];
    f = HEAP32[k >> 2] - HEAP32[k + 8 >> 2];
    g = HEAP32[k + 4 >> 2] - HEAP32[k + 12 >> 2];
    h = HEAP32[k + 4 >> 2] + HEAP32[k + 12 >> 2];
    HEAP32[k >> 2] = e + h;
    HEAP32[k + 4 >> 2] = f + g;
    HEAP32[k + 8 >> 2] = f - g;
    HEAP32[k + 12 >> 2] = e - h;
    k += 16
  }
  k = HEAP32[_levelScale + j * 12 >> 2];
  c = b >= 12 ? 5 : 10;
  do {
    if(c == 5) {
      k <<= l - 2;
      j = 4;
      b:for(;;) {
        e = j;
        j = e - 1;
        if(e == 0) {
          c = 9;
          break b
        }
        e = HEAP32[d >> 2] + HEAP32[d + 32 >> 2];
        f = HEAP32[d >> 2] - HEAP32[d + 32 >> 2];
        g = HEAP32[d + 16 >> 2] - HEAP32[d + 48 >> 2];
        h = HEAP32[d + 16 >> 2] + HEAP32[d + 48 >> 2];
        HEAP32[d >> 2] = (e + h) * k;
        HEAP32[d + 16 >> 2] = (f + g) * k;
        HEAP32[d + 32 >> 2] = (f - g) * k;
        HEAP32[d + 48 >> 2] = (e - h) * k;
        d += 4
      }
    }else {
      if(c == 10) {
        m = 1 - l == 0 ? 1 : 2;
        j = 4;
        b:for(;;) {
          e = j;
          j = e - 1;
          if(e == 0) {
            c = 14;
            break b
          }
          e = HEAP32[d >> 2] + HEAP32[d + 32 >> 2];
          f = HEAP32[d >> 2] - HEAP32[d + 32 >> 2];
          g = HEAP32[d + 16 >> 2] - HEAP32[d + 48 >> 2];
          h = HEAP32[d + 16 >> 2] + HEAP32[d + 48 >> 2];
          HEAP32[d >> 2] = (e + h) * k + m >> 2 - l;
          HEAP32[d + 16 >> 2] = (f + g) * k + m >> 2 - l;
          HEAP32[d + 32 >> 2] = (f - g) * k + m >> 2 - l;
          HEAP32[d + 48 >> 2] = (e - h) * k + m >> 2 - l;
          d += 4
        }
      }
    }
  }while(0)
}
_h264bsdProcessLumaDc.X = 1;
function _h264bsdProcessChromaDc(a, b) {
  var c, d, e, f, g, h;
  d = HEAPU8[_qpDiv6 + b];
  g = HEAP32[_levelScale + HEAPU8[_qpMod6 + b] * 12 >> 2];
  c = b >= 6 ? 1 : 2;
  c == 1 ? (g <<= d - 1, h = 0) : c == 2 && (h = 1);
  c = HEAP32[a >> 2] + HEAP32[a + 8 >> 2];
  d = HEAP32[a >> 2] - HEAP32[a + 8 >> 2];
  e = HEAP32[a + 4 >> 2] - HEAP32[a + 12 >> 2];
  f = HEAP32[a + 4 >> 2] + HEAP32[a + 12 >> 2];
  HEAP32[a >> 2] = (c + f) * g >> h;
  HEAP32[a + 4 >> 2] = (c - f) * g >> h;
  HEAP32[a + 8 >> 2] = (d + e) * g >> h;
  HEAP32[a + 12 >> 2] = (d - e) * g >> h;
  c = HEAP32[a + 16 >> 2] + HEAP32[a + 24 >> 2];
  d = HEAP32[a + 16 >> 2] - HEAP32[a + 24 >> 2];
  e = HEAP32[a + 20 >> 2] - HEAP32[a + 28 >> 2];
  f = HEAP32[a + 20 >> 2] + HEAP32[a + 28 >> 2];
  HEAP32[a + 16 >> 2] = (c + f) * g >> h;
  HEAP32[a + 20 >> 2] = (c - f) * g >> h;
  HEAP32[a + 24 >> 2] = (d + e) * g >> h;
  HEAP32[a + 28 >> 2] = (d - e) * g >> h
}
_h264bsdProcessChromaDc.X = 1;
function _h264bsdNextMbAddress(a, b, c) {
  var d, e, f;
  e = HEAP32[a + (c << 2) >> 2];
  d = c + 1;
  f = HEAP32[a + (d << 2) >> 2];
  a:for(;;) {
    if(d < b) {
      c = 2
    }else {
      var g = 0, c = 3
    }
    c == 2 && (g = f != e);
    if(!g) {
      break a
    }
    d += 1;
    f = HEAP32[a + (d << 2) >> 2]
  }
  (d == b ? 6 : 7) == 6 && (d = 0);
  return d
}
_h264bsdNextMbAddress.X = 1;
function _h264bsdSetCurrImageMbPointers(a, b) {
  var c, d, e, f;
  c = HEAP32[a + 4 >> 2];
  d = HEAP32[a + 8 >> 2];
  e = Math.floor(b / c);
  f = b % c;
  e *= c;
  c *= d;
  HEAP32[a + 12 >> 2] = HEAP32[a >> 2] + (f << 4) + (e << 8);
  HEAP32[a + 16 >> 2] = HEAP32[a >> 2] + (c << 8) + (e << 6) + (f << 3);
  HEAP32[a + 20 >> 2] = HEAP32[a + 16 >> 2] + (c << 6)
}
_h264bsdSetCurrImageMbPointers.X = 1;
function _h264bsdRbspTrailingBits(a) {
  var b, c, d;
  d = 8 - HEAP32[a + 8 >> 2];
  c = _h264bsdGetBits(a, d);
  a = c == -1 ? 1 : 2;
  a == 1 ? b = 1 : a == 2 && (a = c != HEAP32[_stuffingTable + (d - 1 << 2) >> 2] ? 3 : 4, a == 3 ? b = 1 : a == 4 && (b = 0));
  return b
}
function _h264bsdMoreRbspData(a) {
  var b, c, d;
  d = (HEAP32[a + 12 >> 2] << 3) - HEAP32[a + 16 >> 2];
  b = d == 0 ? 1 : 2;
  a:do {
    if(b == 1) {
      c = 0
    }else {
      if(b == 2) {
        b = d > 8 ? 4 : 3;
        b:do {
          if(b == 3) {
            if(_h264bsdShowBits32(a) >>> 32 - d != 1 << d - 1) {
              b = 4;
              break b
            }
            c = 0;
            break a
          }
        }while(0);
        c = 1
      }
    }
  }while(0);
  return c
}
function _h264bsdExtractNalUnit(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n;
  m = k = 0;
  e = b > 3 ? 1 : 36;
  a:do {
    if(e == 1) {
      if(HEAPU8[a] != 0) {
        e = 36;
        break a
      }
      if(HEAPU8[a + 1] != 0) {
        e = 36;
        break a
      }
      if((HEAPU8[a + 2] & 254) != 0) {
        e = 36;
        break a
      }
      j = g = 2;
      n = a + 2;
      b:for(;;) {
        e = n;
        n = e + 1;
        l = HEAP8[e];
        g += 1;
        if(g == b) {
          e = 6;
          break b
        }
        e = l != 0 ? 9 : 8;
        do {
          if(e == 9) {
            e = l == 1 ? 10 : 12;
            do {
              if(e == 10 && j >= 2) {
                e = 11;
                break b
              }
            }while(0);
            j = 0
          }else {
            e == 8 && (j += 1)
          }
        }while(0)
      }
      do {
        if(e == 6) {
          HEAP32[d >> 2] = b;
          f = 1;
          e = 58;
          break a
        }else {
          if(e == 11) {
            h = g;
            j = 0;
            c:for(;;) {
              e = n;
              n = e + 1;
              l = HEAP8[e];
              g += 1;
              e = l != 0 ? 18 : 17;
              e == 17 && (j += 1);
              e = (l & 255 | 0) == 3 ? 19 : 21;
              d:do {
                if(e == 19) {
                  if((j | 0) != 2) {
                    break d
                  }
                  k = 1
                }
              }while(0);
              e = (l & 255 | 0) == 1 ? 22 : 27;
              do {
                if(e == 22 && j >>> 0 >= 2) {
                  e = 23;
                  break c
                }
              }while(0);
              e = l != 0 ? 28 : 31;
              e == 28 && (e = j >= 3 ? 29 : 30, e == 29 && (m = 1), j = 0);
              if(g == b) {
                e = 33;
                break c
              }
            }
            if(e == 23) {
              HEAP32[c + 12 >> 2] = g - h - j - 1;
              e = j < 3 ? 24 : 25;
              if(e == 24) {
                var q = j
              }else {
                e == 25 && (q = 3)
              }
              j -= q
            }else {
              e == 33 && (HEAP32[c + 12 >> 2] = g - h - j)
            }
            e = 37;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  a:do {
    if(e == 36) {
      j = h = 0;
      HEAP32[c + 12 >> 2] = b;
      k = 1;
      e = 37;
      break a
    }
  }while(0);
  a:do {
    if(e == 37) {
      HEAP32[c >> 2] = a + h;
      HEAP32[c + 4 >> 2] = HEAP32[c >> 2];
      HEAP32[c + 8 >> 2] = 0;
      HEAP32[c + 16 >> 2] = 0;
      HEAP32[d >> 2] = HEAP32[c + 12 >> 2] + h + j;
      e = m != 0 ? 38 : 39;
      do {
        if(e == 38) {
          f = 1
        }else {
          if(e == 39) {
            e = k != 0 ? 40 : 57;
            do {
              if(e == 40) {
                f = HEAP32[c + 12 >> 2];
                b = HEAP32[c >> 2];
                n = HEAP32[c >> 2];
                j = 0;
                d:for(;;) {
                  e = f;
                  f = e - 1;
                  if(e == 0) {
                    e = 56;
                    break d
                  }
                  e = j == 2 ? 43 : 48;
                  e:do {
                    if(e == 43) {
                      if(HEAPU8[n] != 3) {
                        e = 48;
                        break e
                      }
                      if(f == 0) {
                        e = 46;
                        break d
                      }
                      if(HEAPU8[n + 1] > 3) {
                        e = 46;
                        break d
                      }
                      n += 1;
                      j = 0;
                      e = 55;
                      break e
                    }
                  }while(0);
                  do {
                    if(e == 48) {
                      e = j == 2 ? 49 : 51;
                      do {
                        if(e == 49 && HEAPU8[n] <= 2) {
                          e = 50;
                          break d
                        }
                      }while(0);
                      e = HEAPU8[n] == 0 ? 52 : 53;
                      e == 52 ? j += 1 : e == 53 && (j = 0);
                      g = n;
                      n = g + 1;
                      g = HEAP8[g];
                      q = b;
                      b = q + 1;
                      HEAP8[q] = g
                    }
                  }while(0)
                }
                do {
                  if(e == 56) {
                    HEAP32[c + 12 >> 2] -= n - b
                  }else {
                    if(e == 46) {
                      f = 1;
                      break a
                    }else {
                      if(e == 50) {
                        f = 1;
                        break a
                      }
                    }
                  }
                }while(0)
              }
            }while(0);
            f = 0
          }
        }
      }while(0)
    }
  }while(0);
  return f
}
_h264bsdExtractNalUnit.X = 1;
function _GetDpbSize(a, b) {
  var c, d, e, f;
  c = b == 10 ? 1 : b == 11 ? 2 : b == 12 ? 3 : b == 13 ? 4 : b == 20 ? 5 : b == 21 ? 6 : b == 22 ? 7 : b == 30 ? 8 : b == 31 ? 9 : b == 32 ? 10 : b == 40 ? 11 : b == 41 ? 12 : b == 42 ? 13 : b == 50 ? 14 : b == 51 ? 15 : 16;
  a:do {
    if(c == 16) {
      d = 2147483647;
      c = 23;
      break a
    }else {
      if(c == 1) {
        e = 152064;
        f = 99;
        c = 17;
        break a
      }else {
        if(c == 2) {
          e = 345600;
          f = 396;
          c = 17;
          break a
        }else {
          if(c == 3) {
            e = 912384;
            f = 396;
            c = 17;
            break a
          }else {
            if(c == 4) {
              e = 912384;
              f = 396;
              c = 17;
              break a
            }else {
              if(c == 5) {
                e = 912384;
                f = 396;
                c = 17;
                break a
              }else {
                if(c == 6) {
                  e = 1824768;
                  f = 792;
                  c = 17;
                  break a
                }else {
                  if(c == 7) {
                    e = 3110400;
                    f = 1620;
                    c = 17;
                    break a
                  }else {
                    if(c == 8) {
                      e = 3110400;
                      f = 1620;
                      c = 17;
                      break a
                    }else {
                      if(c == 9) {
                        e = 6912E3;
                        f = 3600;
                        c = 17;
                        break a
                      }else {
                        if(c == 10) {
                          e = 7864320;
                          f = 5120;
                          c = 17;
                          break a
                        }else {
                          if(c == 11) {
                            e = 12582912;
                            f = 8192;
                            c = 17;
                            break a
                          }else {
                            if(c == 12) {
                              e = 12582912;
                              f = 8192;
                              c = 17;
                              break a
                            }else {
                              if(c == 13) {
                                e = 13369344;
                                f = 8704;
                                c = 17;
                                break a
                              }else {
                                if(c == 14) {
                                  e = 42393600;
                                  f = 22080;
                                  c = 17;
                                  break a
                                }else {
                                  if(c == 15) {
                                    e = 70778880;
                                    f = 36864;
                                    c = 17;
                                    break a
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }while(0);
  if(c == 17) {
    if(c = a > f ? 18 : 19, c == 18) {
      d = 2147483647
    }else {
      if(c == 19) {
        e = Math.floor(e / (a * 384));
        c = e < 16 ? 20 : 21;
        if(c == 20) {
          var g = e
        }else {
          c == 21 && (g = 16)
        }
        d = g
      }
    }
  }
  return d
}
_GetDpbSize.X = 1;
function _h264bsdDecodeSeqParamSet(a, b) {
  var c = STACKTOP;
  STACKTOP += 4;
  var d, e, f, g;
  _H264SwDecMemset(b, 0, 92);
  f = _h264bsdGetBits(a, 8);
  d = f == -1 ? 1 : 2;
  a:do {
    if(d == 1) {
      e = 1
    }else {
      if(d == 2) {
        HEAP32[b >> 2] = f;
        _h264bsdGetBits(a, 1);
        _h264bsdGetBits(a, 1);
        f = _h264bsdGetBits(a, 1);
        d = f == -1 ? 5 : 6;
        do {
          if(d == 5) {
            e = 1
          }else {
            if(d == 6) {
              f = _h264bsdGetBits(a, 5);
              d = f == -1 ? 7 : 8;
              do {
                if(d == 7) {
                  e = 1
                }else {
                  if(d == 8) {
                    f = _h264bsdGetBits(a, 8);
                    d = f == -1 ? 9 : 10;
                    do {
                      if(d == 9) {
                        e = 1
                      }else {
                        if(d == 10) {
                          HEAP32[b + 4 >> 2] = f;
                          f = _h264bsdDecodeExpGolombUnsigned(a, b + 8);
                          d = f != 0 ? 11 : 12;
                          do {
                            if(d == 11) {
                              e = f
                            }else {
                              if(d == 12) {
                                d = HEAPU32[b + 8 >> 2] >= 32 ? 13 : 14;
                                do {
                                  if(d == 13) {
                                    e = 1
                                  }else {
                                    if(d == 14) {
                                      f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                      d = f != 0 ? 15 : 16;
                                      do {
                                        if(d == 15) {
                                          e = f
                                        }else {
                                          if(d == 16) {
                                            d = HEAPU32[c >> 2] > 12 ? 17 : 18;
                                            do {
                                              if(d == 17) {
                                                e = 1
                                              }else {
                                                if(d == 18) {
                                                  HEAP32[b + 12 >> 2] = 1 << HEAP32[c >> 2] + 4;
                                                  f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                  d = f != 0 ? 19 : 20;
                                                  do {
                                                    if(d == 19) {
                                                      e = f
                                                    }else {
                                                      if(d == 20) {
                                                        d = HEAPU32[c >> 2] > 2 ? 21 : 22;
                                                        do {
                                                          if(d == 21) {
                                                            e = 1
                                                          }else {
                                                            if(d == 22) {
                                                              HEAP32[b + 16 >> 2] = HEAP32[c >> 2];
                                                              d = HEAP32[b + 16 >> 2] == 0 ? 23 : 28;
                                                              do {
                                                                if(d == 23) {
                                                                  f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                  d = f != 0 ? 24 : 25;
                                                                  do {
                                                                    if(d == 24) {
                                                                      e = f;
                                                                      break a
                                                                    }else {
                                                                      if(d == 25) {
                                                                        d = HEAPU32[c >> 2] > 12 ? 26 : 27;
                                                                        do {
                                                                          if(d == 26) {
                                                                            e = 1;
                                                                            break a
                                                                          }else {
                                                                            d == 27 && (HEAP32[b + 20 >> 2] = 1 << HEAP32[c >> 2] + 4)
                                                                          }
                                                                        }while(0)
                                                                      }
                                                                    }
                                                                  }while(0)
                                                                }else {
                                                                  if(d == 28) {
                                                                    d = HEAP32[b + 16 >> 2] == 1 ? 29 : 51;
                                                                    do {
                                                                      if(d == 29) {
                                                                        f = _h264bsdGetBits(a, 1);
                                                                        d = f == -1 ? 30 : 31;
                                                                        do {
                                                                          if(d == 30) {
                                                                            e = 1;
                                                                            break a
                                                                          }else {
                                                                            if(d == 31) {
                                                                              HEAP32[b + 24 >> 2] = f == 1 ? 1 : 0;
                                                                              f = _h264bsdDecodeExpGolombSigned(a, b + 28);
                                                                              d = f != 0 ? 32 : 33;
                                                                              do {
                                                                                if(d == 32) {
                                                                                  e = f;
                                                                                  break a
                                                                                }else {
                                                                                  if(d == 33) {
                                                                                    f = _h264bsdDecodeExpGolombSigned(a, b + 32);
                                                                                    d = f != 0 ? 34 : 35;
                                                                                    do {
                                                                                      if(d == 34) {
                                                                                        e = f;
                                                                                        break a
                                                                                      }else {
                                                                                        if(d == 35) {
                                                                                          f = _h264bsdDecodeExpGolombUnsigned(a, b + 36);
                                                                                          d = f != 0 ? 36 : 37;
                                                                                          do {
                                                                                            if(d == 36) {
                                                                                              e = f;
                                                                                              break a
                                                                                            }else {
                                                                                              if(d == 37) {
                                                                                                d = HEAPU32[b + 36 >> 2] > 255 ? 38 : 39;
                                                                                                do {
                                                                                                  if(d == 38) {
                                                                                                    e = 1;
                                                                                                    break a
                                                                                                  }else {
                                                                                                    if(d == 39) {
                                                                                                      d = HEAP32[b + 36 >> 2] != 0 ? 40 : 49;
                                                                                                      do {
                                                                                                        if(d == 40) {
                                                                                                          d = _H264SwDecMalloc(HEAP32[b + 36 >> 2] << 2);
                                                                                                          HEAP32[b + 40 >> 2] = d;
                                                                                                          d = HEAP32[b + 40 >> 2] == 0 ? 41 : 42;
                                                                                                          do {
                                                                                                            if(d == 41) {
                                                                                                              e = 65535;
                                                                                                              break a
                                                                                                            }else {
                                                                                                              if(d == 42) {
                                                                                                                g = 0;
                                                                                                                t:for(;;) {
                                                                                                                  if(!(g < HEAPU32[b + 36 >> 2])) {
                                                                                                                    d = 48;
                                                                                                                    break t
                                                                                                                  }
                                                                                                                  f = _h264bsdDecodeExpGolombSigned(a, HEAP32[b + 40 >> 2] + (g << 2));
                                                                                                                  if(f != 0) {
                                                                                                                    d = 45;
                                                                                                                    break t
                                                                                                                  }
                                                                                                                  g += 1
                                                                                                                }
                                                                                                                do {
                                                                                                                  if(d != 48 && d == 45) {
                                                                                                                    e = f;
                                                                                                                    break a
                                                                                                                  }
                                                                                                                }while(0)
                                                                                                              }
                                                                                                            }
                                                                                                          }while(0)
                                                                                                        }else {
                                                                                                          d == 49 && (HEAP32[b + 40 >> 2] = 0)
                                                                                                        }
                                                                                                      }while(0)
                                                                                                    }
                                                                                                  }
                                                                                                }while(0)
                                                                                              }
                                                                                            }
                                                                                          }while(0)
                                                                                        }
                                                                                      }
                                                                                    }while(0)
                                                                                  }
                                                                                }
                                                                              }while(0)
                                                                            }
                                                                          }
                                                                        }while(0)
                                                                      }
                                                                    }while(0)
                                                                  }
                                                                }
                                                              }while(0);
                                                              f = _h264bsdDecodeExpGolombUnsigned(a, b + 44);
                                                              d = f != 0 ? 53 : 54;
                                                              do {
                                                                if(d == 53) {
                                                                  e = f
                                                                }else {
                                                                  if(d == 54) {
                                                                    d = HEAPU32[b + 44 >> 2] > 16 ? 55 : 56;
                                                                    do {
                                                                      if(d == 55) {
                                                                        e = 1
                                                                      }else {
                                                                        if(d == 56) {
                                                                          f = _h264bsdGetBits(a, 1);
                                                                          d = f == -1 ? 57 : 58;
                                                                          do {
                                                                            if(d == 57) {
                                                                              e = 1
                                                                            }else {
                                                                              if(d == 58) {
                                                                                HEAP32[b + 48 >> 2] = f == 1 ? 1 : 0;
                                                                                f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                d = f != 0 ? 59 : 60;
                                                                                do {
                                                                                  if(d == 59) {
                                                                                    e = f
                                                                                  }else {
                                                                                    if(d == 60) {
                                                                                      HEAP32[b + 52 >> 2] = HEAP32[c >> 2] + 1;
                                                                                      f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                      d = f != 0 ? 61 : 62;
                                                                                      do {
                                                                                        if(d == 61) {
                                                                                          e = f
                                                                                        }else {
                                                                                          if(d == 62) {
                                                                                            HEAP32[b + 56 >> 2] = HEAP32[c >> 2] + 1;
                                                                                            f = _h264bsdGetBits(a, 1);
                                                                                            d = f == -1 ? 63 : 64;
                                                                                            do {
                                                                                              if(d == 63) {
                                                                                                e = 1
                                                                                              }else {
                                                                                                if(d == 64) {
                                                                                                  d = f != 0 ? 66 : 65;
                                                                                                  do {
                                                                                                    if(d == 66) {
                                                                                                      f = _h264bsdGetBits(a, 1);
                                                                                                      d = f == -1 ? 67 : 68;
                                                                                                      do {
                                                                                                        if(d == 67) {
                                                                                                          e = 1
                                                                                                        }else {
                                                                                                          if(d == 68) {
                                                                                                            f = _h264bsdGetBits(a, 1);
                                                                                                            d = f == -1 ? 69 : 70;
                                                                                                            do {
                                                                                                              if(d == 69) {
                                                                                                                e = 1
                                                                                                              }else {
                                                                                                                if(d == 70) {
                                                                                                                  HEAP32[b + 60 >> 2] = f == 1 ? 1 : 0;
                                                                                                                  d = HEAP32[b + 60 >> 2] != 0 ? 71 : 83;
                                                                                                                  t:do {
                                                                                                                    if(d == 71) {
                                                                                                                      f = _h264bsdDecodeExpGolombUnsigned(a, b + 64);
                                                                                                                      d = f != 0 ? 72 : 73;
                                                                                                                      do {
                                                                                                                        if(d == 72) {
                                                                                                                          e = f;
                                                                                                                          break a
                                                                                                                        }else {
                                                                                                                          if(d == 73) {
                                                                                                                            f = _h264bsdDecodeExpGolombUnsigned(a, b + 68);
                                                                                                                            d = f != 0 ? 74 : 75;
                                                                                                                            do {
                                                                                                                              if(d == 74) {
                                                                                                                                e = f;
                                                                                                                                break a
                                                                                                                              }else {
                                                                                                                                if(d == 75) {
                                                                                                                                  f = _h264bsdDecodeExpGolombUnsigned(a, b + 72);
                                                                                                                                  d = f != 0 ? 76 : 77;
                                                                                                                                  do {
                                                                                                                                    if(d == 76) {
                                                                                                                                      e = f;
                                                                                                                                      break a
                                                                                                                                    }else {
                                                                                                                                      if(d == 77) {
                                                                                                                                        f = _h264bsdDecodeExpGolombUnsigned(a, b + 76);
                                                                                                                                        d = f != 0 ? 78 : 79;
                                                                                                                                        do {
                                                                                                                                          if(d == 78) {
                                                                                                                                            e = f;
                                                                                                                                            break a
                                                                                                                                          }else {
                                                                                                                                            if(d == 79) {
                                                                                                                                              d = HEAP32[b + 64 >> 2] > (HEAP32[b + 52 >> 2] << 3) - (HEAP32[b + 68 >> 2] + 1) ? 81 : 80;
                                                                                                                                              y:do {
                                                                                                                                                if(d == 80) {
                                                                                                                                                  if(HEAP32[b + 72 >> 2] > (HEAP32[b + 56 >> 2] << 3) - (HEAP32[b + 76 >> 2] + 1)) {
                                                                                                                                                    break y
                                                                                                                                                  }
                                                                                                                                                  break t
                                                                                                                                                }
                                                                                                                                              }while(0);
                                                                                                                                              e = 1;
                                                                                                                                              break a
                                                                                                                                            }
                                                                                                                                          }
                                                                                                                                        }while(0)
                                                                                                                                      }
                                                                                                                                    }
                                                                                                                                  }while(0)
                                                                                                                                }
                                                                                                                              }
                                                                                                                            }while(0)
                                                                                                                          }
                                                                                                                        }
                                                                                                                      }while(0)
                                                                                                                    }
                                                                                                                  }while(0);
                                                                                                                  f = HEAP32[b + 52 >> 2] * HEAP32[b + 56 >> 2];
                                                                                                                  f = _GetDpbSize(f, HEAP32[b + 4 >> 2]);
                                                                                                                  HEAP32[c >> 2] = f;
                                                                                                                  d = HEAP32[c >> 2] == 2147483647 ? 85 : 84;
                                                                                                                  t:do {
                                                                                                                    if(d == 84) {
                                                                                                                      d = HEAPU32[b + 44 >> 2] > HEAPU32[c >> 2] ? 85 : 86;
                                                                                                                      break t
                                                                                                                    }
                                                                                                                  }while(0);
                                                                                                                  d == 85 && (HEAP32[c >> 2] = HEAP32[b + 44 >> 2]);
                                                                                                                  HEAP32[b + 88 >> 2] = HEAP32[c >> 2];
                                                                                                                  f = _h264bsdGetBits(a, 1);
                                                                                                                  d = f == -1 ? 87 : 88;
                                                                                                                  do {
                                                                                                                    if(d == 87) {
                                                                                                                      e = 1
                                                                                                                    }else {
                                                                                                                      if(d == 88) {
                                                                                                                        HEAP32[b + 80 >> 2] = f == 1 ? 1 : 0;
                                                                                                                        d = HEAP32[b + 80 >> 2] != 0 ? 89 : 103;
                                                                                                                        do {
                                                                                                                          if(d == 89) {
                                                                                                                            e = _H264SwDecMalloc(952);
                                                                                                                            HEAP32[b + 84 >> 2] = e;
                                                                                                                            d = HEAP32[b + 84 >> 2] == 0 ? 90 : 91;
                                                                                                                            do {
                                                                                                                              if(d == 90) {
                                                                                                                                e = 65535;
                                                                                                                                break a
                                                                                                                              }else {
                                                                                                                                if(d == 91) {
                                                                                                                                  f = _h264bsdDecodeVuiParameters(a, HEAP32[b + 84 >> 2]);
                                                                                                                                  d = f != 0 ? 92 : 93;
                                                                                                                                  do {
                                                                                                                                    if(d == 92) {
                                                                                                                                      e = f;
                                                                                                                                      break a
                                                                                                                                    }else {
                                                                                                                                      if(d == 93) {
                                                                                                                                        d = HEAP32[HEAP32[b + 84 >> 2] + 920 >> 2] != 0 ? 94 : 102;
                                                                                                                                        x:do {
                                                                                                                                          if(d == 94) {
                                                                                                                                            d = HEAPU32[HEAP32[b + 84 >> 2] + 944 >> 2] > HEAPU32[HEAP32[b + 84 >> 2] + 948 >> 2] ? 97 : 95;
                                                                                                                                            y:do {
                                                                                                                                              if(d == 95) {
                                                                                                                                                if(HEAPU32[HEAP32[b + 84 >> 2] + 948 >> 2] < HEAPU32[b + 44 >> 2]) {
                                                                                                                                                  break y
                                                                                                                                                }
                                                                                                                                                if(HEAPU32[HEAP32[b + 84 >> 2] + 948 >> 2] > HEAPU32[b + 88 >> 2]) {
                                                                                                                                                  break y
                                                                                                                                                }
                                                                                                                                                d = 1 > HEAPU32[HEAP32[b + 84 >> 2] + 948 >> 2] ? 99 : 100;
                                                                                                                                                if(d == 99) {
                                                                                                                                                  var h = 1
                                                                                                                                                }else {
                                                                                                                                                  d == 100 && (h = HEAP32[HEAP32[b + 84 >> 2] + 948 >> 2])
                                                                                                                                                }
                                                                                                                                                HEAP32[b + 88 >> 2] = h;
                                                                                                                                                d = 102;
                                                                                                                                                break x
                                                                                                                                              }
                                                                                                                                            }while(0);
                                                                                                                                            e = 1;
                                                                                                                                            break a
                                                                                                                                          }
                                                                                                                                        }while(0)
                                                                                                                                      }
                                                                                                                                    }
                                                                                                                                  }while(0)
                                                                                                                                }
                                                                                                                              }
                                                                                                                            }while(0)
                                                                                                                          }
                                                                                                                        }while(0);
                                                                                                                        f = _h264bsdRbspTrailingBits(a);
                                                                                                                        e = 0
                                                                                                                      }
                                                                                                                    }
                                                                                                                  }while(0)
                                                                                                                }
                                                                                                              }
                                                                                                            }while(0)
                                                                                                          }
                                                                                                        }
                                                                                                      }while(0)
                                                                                                    }else {
                                                                                                      d == 65 && (e = 1)
                                                                                                    }
                                                                                                  }while(0)
                                                                                                }
                                                                                              }
                                                                                            }while(0)
                                                                                          }
                                                                                        }
                                                                                      }while(0)
                                                                                    }
                                                                                  }
                                                                                }while(0)
                                                                              }
                                                                            }
                                                                          }while(0)
                                                                        }
                                                                      }
                                                                    }while(0)
                                                                  }
                                                                }
                                                              }while(0)
                                                            }
                                                          }
                                                        }while(0)
                                                      }
                                                    }
                                                  }while(0)
                                                }
                                              }
                                            }while(0)
                                          }
                                        }
                                      }while(0)
                                    }
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = c;
  return e
}
_h264bsdDecodeSeqParamSet.X = 1;
function _h264bsdCompareSeqParamSets(a, b) {
  var c, d;
  c = HEAP32[a >> 2] == HEAP32[b >> 2] ? 1 : 37;
  a:do {
    if(c == 1) {
      if(HEAP32[a + 4 >> 2] != HEAP32[b + 4 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 12 >> 2] != HEAP32[b + 12 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 16 >> 2] != HEAP32[b + 16 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 44 >> 2] != HEAP32[b + 44 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 48 >> 2] != HEAP32[b + 48 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 52 >> 2] != HEAP32[b + 52 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 56 >> 2] != HEAP32[b + 56 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 60 >> 2] != HEAP32[b + 60 >> 2]) {
        c = 37;
        break a
      }
      if(HEAP32[a + 80 >> 2] != HEAP32[b + 80 >> 2]) {
        c = 37;
        break a
      }
      c = HEAP32[a + 16 >> 2] == 0 ? 11 : 14;
      do {
        if(c == 11) {
          c = HEAP32[a + 20 >> 2] != HEAP32[b + 20 >> 2] ? 12 : 13;
          do {
            if(c == 12) {
              d = 1;
              c = 38;
              break a
            }
          }while(0)
        }else {
          if(c == 14) {
            c = HEAP32[a + 16 >> 2] == 1 ? 15 : 28;
            c:do {
              if(c == 15) {
                c = HEAP32[a + 24 >> 2] != HEAP32[b + 24 >> 2] ? 19 : 16;
                d:do {
                  if(c == 16) {
                    if(HEAP32[a + 28 >> 2] != HEAP32[b + 28 >> 2]) {
                      break d
                    }
                    if(HEAP32[a + 32 >> 2] != HEAP32[b + 32 >> 2]) {
                      break d
                    }
                    if(HEAP32[a + 36 >> 2] != HEAP32[b + 36 >> 2]) {
                      break d
                    }
                    d = 0;
                    e:for(;;) {
                      if(!(d < HEAPU32[a + 36 >> 2])) {
                        c = 26;
                        break e
                      }
                      if(HEAP32[HEAP32[a + 40 >> 2] + (d << 2) >> 2] != HEAP32[HEAP32[b + 40 >> 2] + (d << 2) >> 2]) {
                        c = 23;
                        break e
                      }
                      d += 1
                    }
                    do {
                      if(c == 26) {
                        c = 28;
                        break c
                      }else {
                        if(c == 23) {
                          d = 1;
                          c = 38;
                          break a
                        }
                      }
                    }while(0)
                  }
                }while(0);
                d = 1;
                c = 38;
                break a
              }
            }while(0)
          }
        }
      }while(0);
      c = HEAP32[a + 60 >> 2] != 0 ? 30 : 36;
      b:do {
        if(c == 30) {
          c = HEAP32[a + 64 >> 2] != HEAP32[b + 64 >> 2] ? 34 : 31;
          c:do {
            if(c == 31) {
              if(HEAP32[a + 68 >> 2] != HEAP32[b + 68 >> 2]) {
                break c
              }
              if(HEAP32[a + 72 >> 2] != HEAP32[b + 72 >> 2]) {
                break c
              }
              if(HEAP32[a + 76 >> 2] != HEAP32[b + 76 >> 2]) {
                break c
              }
              break b
            }
          }while(0);
          d = 1;
          c = 38;
          break a
        }
      }while(0);
      d = 0;
      c = 38;
      break a
    }
  }while(0);
  c == 37 && (d = 1);
  return d
}
_h264bsdCompareSeqParamSets.X = 1;
function _h264bsdDecodePicParamSet(a, b) {
  var c = STACKTOP;
  STACKTOP += 8;
  var d, e, f, g, h = c + 4;
  _H264SwDecMemset(b, 0, 72);
  f = _h264bsdDecodeExpGolombUnsigned(a, b);
  d = f != 0 ? 1 : 2;
  a:do {
    if(d == 1) {
      e = f
    }else {
      if(d == 2) {
        d = HEAPU32[b >> 2] >= 256 ? 3 : 4;
        do {
          if(d == 3) {
            e = 1
          }else {
            if(d == 4) {
              f = _h264bsdDecodeExpGolombUnsigned(a, b + 4);
              d = f != 0 ? 5 : 6;
              do {
                if(d == 5) {
                  e = f
                }else {
                  if(d == 6) {
                    d = HEAPU32[b + 4 >> 2] >= 32 ? 7 : 8;
                    do {
                      if(d == 7) {
                        e = 1
                      }else {
                        if(d == 8) {
                          f = _h264bsdGetBits(a, 1);
                          d = f != 0 ? 9 : 10;
                          do {
                            if(d == 9) {
                              e = 1
                            }else {
                              if(d == 10) {
                                f = _h264bsdGetBits(a, 1);
                                d = f == -1 ? 11 : 12;
                                do {
                                  if(d == 11) {
                                    e = 1
                                  }else {
                                    if(d == 12) {
                                      HEAP32[b + 8 >> 2] = f == 1 ? 1 : 0;
                                      f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                      d = f != 0 ? 13 : 14;
                                      do {
                                        if(d == 13) {
                                          e = f
                                        }else {
                                          if(d == 14) {
                                            HEAP32[b + 12 >> 2] = HEAP32[c >> 2] + 1;
                                            d = HEAPU32[b + 12 >> 2] > 8 ? 15 : 16;
                                            do {
                                              if(d == 15) {
                                                e = 1
                                              }else {
                                                if(d == 16) {
                                                  d = HEAPU32[b + 12 >> 2] > 1 ? 17 : 68;
                                                  do {
                                                    if(d == 17) {
                                                      f = _h264bsdDecodeExpGolombUnsigned(a, b + 16);
                                                      d = f != 0 ? 18 : 19;
                                                      do {
                                                        if(d == 18) {
                                                          e = f;
                                                          break a
                                                        }else {
                                                          if(d == 19) {
                                                            d = HEAPU32[b + 16 >> 2] > 6 ? 20 : 21;
                                                            do {
                                                              if(d == 20) {
                                                                e = 1;
                                                                break a
                                                              }else {
                                                                if(d == 21) {
                                                                  d = HEAP32[b + 16 >> 2] == 0 ? 22 : 31;
                                                                  do {
                                                                    if(d == 22) {
                                                                      d = _H264SwDecMalloc(HEAP32[b + 12 >> 2] << 2);
                                                                      HEAP32[b + 20 >> 2] = d;
                                                                      d = HEAP32[b + 20 >> 2] == 0 ? 23 : 24;
                                                                      do {
                                                                        if(d == 23) {
                                                                          e = 65535;
                                                                          break a
                                                                        }else {
                                                                          if(d == 24) {
                                                                            g = 0;
                                                                            n:for(;;) {
                                                                              if(!(g < HEAPU32[b + 12 >> 2])) {
                                                                                d = 30;
                                                                                break n
                                                                              }
                                                                              f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                              if(f != 0) {
                                                                                d = 27;
                                                                                break n
                                                                              }
                                                                              HEAP32[HEAP32[b + 20 >> 2] + (g << 2) >> 2] = HEAP32[c >> 2] + 1;
                                                                              g += 1
                                                                            }
                                                                            do {
                                                                              if(d != 30 && d == 27) {
                                                                                e = f;
                                                                                break a
                                                                              }
                                                                            }while(0)
                                                                          }
                                                                        }
                                                                      }while(0)
                                                                    }else {
                                                                      if(d == 31) {
                                                                        d = HEAP32[b + 16 >> 2] == 2 ? 32 : 44;
                                                                        m:do {
                                                                          if(d == 32) {
                                                                            d = _H264SwDecMalloc(HEAP32[b + 12 >> 2] - 1 << 2);
                                                                            HEAP32[b + 24 >> 2] = d;
                                                                            d = _H264SwDecMalloc(HEAP32[b + 12 >> 2] - 1 << 2);
                                                                            HEAP32[b + 28 >> 2] = d;
                                                                            d = HEAP32[b + 24 >> 2] == 0 ? 34 : 33;
                                                                            n:do {
                                                                              if(d == 33) {
                                                                                if(HEAP32[b + 28 >> 2] == 0) {
                                                                                  break n
                                                                                }
                                                                                g = 0;
                                                                                o:for(;;) {
                                                                                  if(!(g < HEAP32[b + 12 >> 2] - 1)) {
                                                                                    d = 43;
                                                                                    break o
                                                                                  }
                                                                                  f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                  if(f != 0) {
                                                                                    d = 38;
                                                                                    break o
                                                                                  }
                                                                                  HEAP32[HEAP32[b + 24 >> 2] + (g << 2) >> 2] = HEAP32[c >> 2];
                                                                                  f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                  if(f != 0) {
                                                                                    d = 40;
                                                                                    break o
                                                                                  }
                                                                                  HEAP32[HEAP32[b + 28 >> 2] + (g << 2) >> 2] = HEAP32[c >> 2];
                                                                                  g += 1
                                                                                }
                                                                                do {
                                                                                  if(d == 43) {
                                                                                    d = 66;
                                                                                    break m
                                                                                  }else {
                                                                                    if(d == 38) {
                                                                                      e = f;
                                                                                      break a
                                                                                    }else {
                                                                                      if(d == 40) {
                                                                                        e = f;
                                                                                        break a
                                                                                      }
                                                                                    }
                                                                                  }
                                                                                }while(0)
                                                                              }
                                                                            }while(0);
                                                                            e = 65535;
                                                                            break a
                                                                          }else {
                                                                            if(d == 44) {
                                                                              d = HEAP32[b + 16 >> 2] == 3 ? 47 : 45;
                                                                              n:do {
                                                                                if(d == 45) {
                                                                                  if(HEAP32[b + 16 >> 2] == 4) {
                                                                                    d = 47;
                                                                                    break n
                                                                                  }
                                                                                  if(HEAP32[b + 16 >> 2] == 5) {
                                                                                    d = 47;
                                                                                    break n
                                                                                  }
                                                                                  d = HEAP32[b + 16 >> 2] == 6 ? 53 : 64;
                                                                                  do {
                                                                                    if(d == 53) {
                                                                                      f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                      d = f != 0 ? 54 : 55;
                                                                                      do {
                                                                                        if(d == 54) {
                                                                                          e = f;
                                                                                          break a
                                                                                        }else {
                                                                                          if(d == 55) {
                                                                                            HEAP32[b + 40 >> 2] = HEAP32[c >> 2] + 1;
                                                                                            d = _H264SwDecMalloc(HEAP32[b + 40 >> 2] << 2);
                                                                                            HEAP32[b + 44 >> 2] = d;
                                                                                            d = HEAP32[b + 44 >> 2] == 0 ? 56 : 57;
                                                                                            do {
                                                                                              if(d == 56) {
                                                                                                e = 65535;
                                                                                                break a
                                                                                              }else {
                                                                                                if(d == 57) {
                                                                                                  f = HEAP32[_CeilLog2NumSliceGroups + (HEAP32[b + 12 >> 2] - 1 << 2) >> 2];
                                                                                                  g = 0;
                                                                                                  r:for(;;) {
                                                                                                    if(!(g < HEAPU32[b + 40 >> 2])) {
                                                                                                      d = 63;
                                                                                                      break r
                                                                                                    }
                                                                                                    var j = _h264bsdGetBits(a, f);
                                                                                                    HEAP32[HEAP32[b + 44 >> 2] + (g << 2) >> 2] = j;
                                                                                                    if(HEAPU32[HEAP32[b + 44 >> 2] + (g << 2) >> 2] >= HEAPU32[b + 12 >> 2]) {
                                                                                                      d = 60;
                                                                                                      break r
                                                                                                    }
                                                                                                    g += 1
                                                                                                  }
                                                                                                  do {
                                                                                                    if(d != 63 && d == 60) {
                                                                                                      e = 1;
                                                                                                      break a
                                                                                                    }
                                                                                                  }while(0)
                                                                                                }
                                                                                              }
                                                                                            }while(0)
                                                                                          }
                                                                                        }
                                                                                      }while(0)
                                                                                    }
                                                                                  }while(0);
                                                                                  d = 65;
                                                                                  break n
                                                                                }
                                                                              }while(0);
                                                                              do {
                                                                                if(d == 47) {
                                                                                  f = _h264bsdGetBits(a, 1);
                                                                                  d = f == -1 ? 48 : 49;
                                                                                  do {
                                                                                    if(d == 48) {
                                                                                      e = 1;
                                                                                      break a
                                                                                    }else {
                                                                                      if(d == 49) {
                                                                                        HEAP32[b + 32 >> 2] = f == 1 ? 1 : 0;
                                                                                        f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                                                        d = f != 0 ? 50 : 51;
                                                                                        do {
                                                                                          if(d == 50) {
                                                                                            e = f;
                                                                                            break a
                                                                                          }else {
                                                                                            d == 51 && (HEAP32[b + 36 >> 2] = HEAP32[c >> 2] + 1)
                                                                                          }
                                                                                        }while(0)
                                                                                      }
                                                                                    }
                                                                                  }while(0)
                                                                                }
                                                                              }while(0)
                                                                            }
                                                                          }
                                                                        }while(0)
                                                                      }
                                                                    }
                                                                  }while(0)
                                                                }
                                                              }
                                                            }while(0)
                                                          }
                                                        }
                                                      }while(0)
                                                    }
                                                  }while(0);
                                                  f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                  d = f != 0 ? 69 : 70;
                                                  do {
                                                    if(d == 69) {
                                                      e = f
                                                    }else {
                                                      if(d == 70) {
                                                        d = HEAPU32[c >> 2] > 31 ? 71 : 72;
                                                        do {
                                                          if(d == 71) {
                                                            e = 1
                                                          }else {
                                                            if(d == 72) {
                                                              HEAP32[b + 48 >> 2] = HEAP32[c >> 2] + 1;
                                                              f = _h264bsdDecodeExpGolombUnsigned(a, c);
                                                              d = f != 0 ? 73 : 74;
                                                              do {
                                                                if(d == 73) {
                                                                  e = f
                                                                }else {
                                                                  if(d == 74) {
                                                                    d = HEAPU32[c >> 2] > 31 ? 75 : 76;
                                                                    do {
                                                                      if(d == 75) {
                                                                        e = 1
                                                                      }else {
                                                                        if(d == 76) {
                                                                          f = _h264bsdGetBits(a, 1);
                                                                          d = f != 0 ? 77 : 78;
                                                                          do {
                                                                            if(d == 77) {
                                                                              e = 1
                                                                            }else {
                                                                              if(d == 78) {
                                                                                f = _h264bsdGetBits(a, 2);
                                                                                d = f > 2 ? 79 : 80;
                                                                                do {
                                                                                  if(d == 79) {
                                                                                    e = 1
                                                                                  }else {
                                                                                    if(d == 80) {
                                                                                      f = _h264bsdDecodeExpGolombSigned(a, h);
                                                                                      d = f != 0 ? 81 : 82;
                                                                                      do {
                                                                                        if(d == 81) {
                                                                                          e = f
                                                                                        }else {
                                                                                          if(d == 82) {
                                                                                            d = HEAP32[h >> 2] < -26 ? 84 : 83;
                                                                                            p:do {
                                                                                              if(d == 83) {
                                                                                                if(HEAP32[h >> 2] > 25) {
                                                                                                  d = 84;
                                                                                                  break p
                                                                                                }
                                                                                                HEAP32[b + 52 >> 2] = HEAP32[h >> 2] + 26;
                                                                                                f = _h264bsdDecodeExpGolombSigned(a, h);
                                                                                                d = f != 0 ? 86 : 87;
                                                                                                do {
                                                                                                  if(d == 86) {
                                                                                                    e = f;
                                                                                                    break a
                                                                                                  }else {
                                                                                                    if(d == 87) {
                                                                                                      d = HEAP32[h >> 2] < -26 ? 89 : 88;
                                                                                                      r:do {
                                                                                                        if(d == 88) {
                                                                                                          if(HEAP32[h >> 2] > 25) {
                                                                                                            break r
                                                                                                          }
                                                                                                          f = _h264bsdDecodeExpGolombSigned(a, h);
                                                                                                          d = f != 0 ? 91 : 92;
                                                                                                          do {
                                                                                                            if(d == 91) {
                                                                                                              e = f;
                                                                                                              break a
                                                                                                            }else {
                                                                                                              if(d == 92) {
                                                                                                                d = HEAP32[h >> 2] < -12 ? 94 : 93;
                                                                                                                t:do {
                                                                                                                  if(d == 93) {
                                                                                                                    if(HEAP32[h >> 2] > 12) {
                                                                                                                      break t
                                                                                                                    }
                                                                                                                    HEAP32[b + 56 >> 2] = HEAP32[h >> 2];
                                                                                                                    f = _h264bsdGetBits(a, 1);
                                                                                                                    d = f == -1 ? 96 : 97;
                                                                                                                    do {
                                                                                                                      if(d == 96) {
                                                                                                                        e = 1;
                                                                                                                        break a
                                                                                                                      }else {
                                                                                                                        if(d == 97) {
                                                                                                                          HEAP32[b + 60 >> 2] = f == 1 ? 1 : 0;
                                                                                                                          f = _h264bsdGetBits(a, 1);
                                                                                                                          d = f == -1 ? 98 : 99;
                                                                                                                          do {
                                                                                                                            if(d == 98) {
                                                                                                                              e = 1;
                                                                                                                              break a
                                                                                                                            }else {
                                                                                                                              if(d == 99) {
                                                                                                                                HEAP32[b + 64 >> 2] = f == 1 ? 1 : 0;
                                                                                                                                f = _h264bsdGetBits(a, 1);
                                                                                                                                d = f == -1 ? 100 : 101;
                                                                                                                                do {
                                                                                                                                  if(d == 100) {
                                                                                                                                    e = 1;
                                                                                                                                    break a
                                                                                                                                  }else {
                                                                                                                                    if(d == 101) {
                                                                                                                                      HEAP32[b + 68 >> 2] = f == 1 ? 1 : 0;
                                                                                                                                      _h264bsdRbspTrailingBits(a);
                                                                                                                                      e = 0;
                                                                                                                                      break a
                                                                                                                                    }
                                                                                                                                  }
                                                                                                                                }while(0)
                                                                                                                              }
                                                                                                                            }
                                                                                                                          }while(0)
                                                                                                                        }
                                                                                                                      }
                                                                                                                    }while(0)
                                                                                                                  }
                                                                                                                }while(0);
                                                                                                                e = 1;
                                                                                                                break a
                                                                                                              }
                                                                                                            }
                                                                                                          }while(0)
                                                                                                        }
                                                                                                      }while(0);
                                                                                                      e = 1;
                                                                                                      break a
                                                                                                    }
                                                                                                  }
                                                                                                }while(0)
                                                                                              }
                                                                                            }while(0);
                                                                                            e = 1
                                                                                          }
                                                                                        }
                                                                                      }while(0)
                                                                                    }
                                                                                  }
                                                                                }while(0)
                                                                              }
                                                                            }
                                                                          }while(0)
                                                                        }
                                                                      }
                                                                    }while(0)
                                                                  }
                                                                }
                                                              }while(0)
                                                            }
                                                          }
                                                        }while(0)
                                                      }
                                                    }
                                                  }while(0)
                                                }
                                              }
                                            }while(0)
                                          }
                                        }
                                      }while(0)
                                    }
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = c;
  return e
}
_h264bsdDecodePicParamSet.X = 1;
function _h264bsdDecodeSliceHeader(a, b, c, d, e) {
  var f = STACKTOP;
  STACKTOP += 8;
  var g, h, j, l = f + 4, k;
  _H264SwDecMemset(b, 0, 988);
  k = HEAP32[c + 52 >> 2] * HEAP32[c + 56 >> 2];
  j = _h264bsdDecodeExpGolombUnsigned(a, f);
  g = j != 0 ? 1 : 2;
  a:do {
    if(g == 1) {
      h = j
    }else {
      if(g == 2) {
        HEAP32[b >> 2] = HEAP32[f >> 2];
        g = HEAPU32[f >> 2] >= k ? 3 : 4;
        do {
          if(g == 3) {
            h = 1
          }else {
            if(g == 4) {
              j = _h264bsdDecodeExpGolombUnsigned(a, f);
              g = j != 0 ? 5 : 6;
              do {
                if(g == 5) {
                  h = j
                }else {
                  if(g == 6) {
                    HEAP32[b + 4 >> 2] = HEAP32[f >> 2];
                    g = HEAP32[b + 4 >> 2] == 2 ? 13 : 7;
                    d:do {
                      if(g == 7) {
                        if(HEAP32[b + 4 >> 2] == 7) {
                          break d
                        }
                        g = HEAP32[b + 4 >> 2] == 0 ? 10 : 9;
                        e:do {
                          if(g == 9) {
                            g = HEAP32[b + 4 >> 2] == 5 ? 10 : 12;
                            break e
                          }
                        }while(0);
                        e:do {
                          if(g == 10) {
                            if(HEAP32[e >> 2] == 5) {
                              break e
                            }
                            if(HEAP32[c + 44 >> 2] != 0) {
                              break d
                            }
                          }
                        }while(0);
                        h = 1;
                        break a
                      }
                    }while(0);
                    j = _h264bsdDecodeExpGolombUnsigned(a, f);
                    g = j != 0 ? 14 : 15;
                    do {
                      if(g == 14) {
                        h = j
                      }else {
                        if(g == 15) {
                          HEAP32[b + 8 >> 2] = HEAP32[f >> 2];
                          g = HEAP32[b + 8 >> 2] != HEAP32[d >> 2] ? 16 : 17;
                          do {
                            if(g == 16) {
                              h = 1
                            }else {
                              if(g == 17) {
                                g = 0;
                                f:for(;;) {
                                  if(HEAPU32[c + 12 >> 2] >>> g == 0) {
                                    break f
                                  }
                                  g += 1
                                }
                                g -= 1;
                                j = _h264bsdGetBits(a, g);
                                g = j == -1 ? 21 : 22;
                                do {
                                  if(g == 21) {
                                    h = 1
                                  }else {
                                    if(g == 22) {
                                      g = HEAP32[e >> 2] == 5 ? 23 : 25;
                                      g:do {
                                        if(g == 23) {
                                          if(j == 0) {
                                            break g
                                          }
                                          h = 1;
                                          break a
                                        }
                                      }while(0);
                                      HEAP32[b + 12 >> 2] = j;
                                      g = HEAP32[e >> 2] == 5 ? 26 : 31;
                                      do {
                                        if(g == 26) {
                                          j = _h264bsdDecodeExpGolombUnsigned(a, f);
                                          g = j != 0 ? 27 : 28;
                                          do {
                                            if(g == 27) {
                                              h = j;
                                              break a
                                            }else {
                                              if(g == 28) {
                                                HEAP32[b + 16 >> 2] = HEAP32[f >> 2];
                                                g = HEAPU32[f >> 2] > 65535 ? 29 : 30;
                                                do {
                                                  if(g == 29) {
                                                    h = 1;
                                                    break a
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[c + 16 >> 2] == 0 ? 32 : 49;
                                      do {
                                        if(g == 32) {
                                          g = 0;
                                          h:for(;;) {
                                            if(HEAPU32[c + 20 >> 2] >>> g == 0) {
                                              break h
                                            }
                                            g += 1
                                          }
                                          g -= 1;
                                          j = _h264bsdGetBits(a, g);
                                          g = j == -1 ? 36 : 37;
                                          do {
                                            if(g == 36) {
                                              h = 1;
                                              break a
                                            }else {
                                              if(g == 37) {
                                                HEAP32[b + 20 >> 2] = j;
                                                g = HEAP32[d + 8 >> 2] != 0 ? 38 : 41;
                                                do {
                                                  if(g == 38) {
                                                    j = _h264bsdDecodeExpGolombSigned(a, l);
                                                    g = j != 0 ? 39 : 40;
                                                    do {
                                                      if(g == 39) {
                                                        h = j;
                                                        break a
                                                      }else {
                                                        g == 40 && (HEAP32[b + 24 >> 2] = HEAP32[l >> 2])
                                                      }
                                                    }while(0)
                                                  }
                                                }while(0);
                                                g = HEAP32[e >> 2] == 5 ? 42 : 48;
                                                i:do {
                                                  if(g == 42) {
                                                    g = HEAPU32[b + 20 >> 2] > Math.floor(HEAPU32[c + 20 >> 2] / 2) ? 47 : 43;
                                                    do {
                                                      if(g == 43) {
                                                        g = HEAP32[b + 20 >> 2] < HEAP32[b + 20 >> 2] + HEAP32[b + 24 >> 2] ? 44 : 45;
                                                        if(g == 44) {
                                                          var m = HEAP32[b + 20 >> 2]
                                                        }else {
                                                          g == 45 && (m = HEAP32[b + 20 >> 2] + HEAP32[b + 24 >> 2])
                                                        }
                                                        if(m == 0) {
                                                          g = 48;
                                                          break i
                                                        }
                                                      }
                                                    }while(0);
                                                    h = 1;
                                                    break a
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[c + 16 >> 2] == 1 ? 50 : 64;
                                      g:do {
                                        if(g == 50) {
                                          if(HEAP32[c + 24 >> 2] != 0) {
                                            break g
                                          }
                                          j = _h264bsdDecodeExpGolombSigned(a, l);
                                          g = j != 0 ? 52 : 53;
                                          do {
                                            if(g == 52) {
                                              h = j;
                                              break a
                                            }else {
                                              if(g == 53) {
                                                HEAP32[b + 28 >> 2] = HEAP32[l >> 2];
                                                g = HEAP32[d + 8 >> 2] != 0 ? 54 : 57;
                                                do {
                                                  if(g == 54) {
                                                    j = _h264bsdDecodeExpGolombSigned(a, l);
                                                    g = j != 0 ? 55 : 56;
                                                    do {
                                                      if(g == 55) {
                                                        h = j;
                                                        break a
                                                      }else {
                                                        g == 56 && (HEAP32[b + 32 >> 2] = HEAP32[l >> 2])
                                                      }
                                                    }while(0)
                                                  }
                                                }while(0);
                                                g = HEAP32[e >> 2] == 5 ? 58 : 63;
                                                i:do {
                                                  if(g == 58) {
                                                    g = HEAP32[b + 28 >> 2] < HEAP32[b + 28 >> 2] + HEAP32[c + 32 >> 2] + HEAP32[b + 32 >> 2] ? 59 : 60;
                                                    if(g == 59) {
                                                      var n = HEAP32[b + 28 >> 2]
                                                    }else {
                                                      g == 60 && (n = HEAP32[b + 28 >> 2] + HEAP32[c + 32 >> 2] + HEAP32[b + 32 >> 2])
                                                    }
                                                    if(n == 0) {
                                                      g = 63;
                                                      break i
                                                    }
                                                    h = 1;
                                                    break a
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[d + 68 >> 2] != 0 ? 65 : 70;
                                      do {
                                        if(g == 65) {
                                          j = _h264bsdDecodeExpGolombUnsigned(a, f);
                                          g = j != 0 ? 66 : 67;
                                          do {
                                            if(g == 66) {
                                              h = j;
                                              break a
                                            }else {
                                              if(g == 67) {
                                                HEAP32[b + 36 >> 2] = HEAP32[f >> 2];
                                                g = HEAPU32[f >> 2] > 127 ? 68 : 69;
                                                do {
                                                  if(g == 68) {
                                                    h = 1;
                                                    break a
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[b + 4 >> 2] == 0 ? 72 : 71;
                                      g:do {
                                        if(g == 71) {
                                          g = HEAP32[b + 4 >> 2] == 5 ? 72 : 84;
                                          break g
                                        }
                                      }while(0);
                                      do {
                                        if(g == 72) {
                                          j = _h264bsdGetBits(a, 1);
                                          g = j == -1 ? 73 : 74;
                                          do {
                                            if(g == 73) {
                                              h = 1;
                                              break a
                                            }else {
                                              if(g == 74) {
                                                HEAP32[b + 40 >> 2] = j;
                                                g = HEAP32[b + 40 >> 2] != 0 ? 75 : 80;
                                                do {
                                                  if(g == 75) {
                                                    j = _h264bsdDecodeExpGolombUnsigned(a, f);
                                                    g = j != 0 ? 76 : 77;
                                                    do {
                                                      if(g == 76) {
                                                        h = j;
                                                        break a
                                                      }else {
                                                        if(g == 77) {
                                                          g = HEAPU32[f >> 2] > 15 ? 78 : 79;
                                                          do {
                                                            if(g == 78) {
                                                              h = 1;
                                                              break a
                                                            }else {
                                                              g == 79 && (HEAP32[b + 44 >> 2] = HEAP32[f >> 2] + 1)
                                                            }
                                                          }while(0)
                                                        }
                                                      }
                                                    }while(0)
                                                  }else {
                                                    if(g == 80) {
                                                      g = HEAPU32[d + 48 >> 2] > 16 ? 81 : 82;
                                                      do {
                                                        if(g == 81) {
                                                          h = 1;
                                                          break a
                                                        }else {
                                                          g == 82 && (HEAP32[b + 44 >> 2] = HEAP32[d + 48 >> 2])
                                                        }
                                                      }while(0)
                                                    }
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[b + 4 >> 2] == 0 ? 86 : 85;
                                      g:do {
                                        if(g == 85) {
                                          g = HEAP32[b + 4 >> 2] == 5 ? 86 : 89;
                                          break g
                                        }
                                      }while(0);
                                      do {
                                        if(g == 86) {
                                          j = _RefPicListReordering(a, b + 68, HEAP32[b + 44 >> 2], HEAP32[c + 12 >> 2]);
                                          g = j != 0 ? 87 : 88;
                                          do {
                                            if(g == 87) {
                                              h = j;
                                              break a
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      g = HEAP32[e + 4 >> 2] != 0 ? 90 : 93;
                                      do {
                                        if(g == 90) {
                                          j = _DecRefPicMarking(a, b + 276, HEAP32[e >> 2], HEAP32[c + 44 >> 2]);
                                          g = j != 0 ? 91 : 92;
                                          do {
                                            if(g == 91) {
                                              h = j;
                                              break a
                                            }
                                          }while(0)
                                        }
                                      }while(0);
                                      j = _h264bsdDecodeExpGolombSigned(a, l);
                                      g = j != 0 ? 94 : 95;
                                      do {
                                        if(g == 94) {
                                          h = j
                                        }else {
                                          if(g == 95) {
                                            HEAP32[b + 48 >> 2] = HEAP32[l >> 2];
                                            HEAP32[l >> 2] += HEAP32[d + 52 >> 2];
                                            g = HEAP32[l >> 2] < 0 ? 97 : 96;
                                            h:do {
                                              if(g == 96) {
                                                if(HEAP32[l >> 2] > 51) {
                                                  g = 97;
                                                  break h
                                                }
                                                g = HEAP32[d + 60 >> 2] != 0 ? 99 : 116;
                                                do {
                                                  if(g == 99) {
                                                    j = _h264bsdDecodeExpGolombUnsigned(a, f);
                                                    g = j != 0 ? 100 : 101;
                                                    do {
                                                      if(g == 100) {
                                                        h = j;
                                                        break a
                                                      }else {
                                                        if(g == 101) {
                                                          HEAP32[b + 52 >> 2] = HEAP32[f >> 2];
                                                          g = HEAPU32[b + 52 >> 2] > 2 ? 102 : 103;
                                                          do {
                                                            if(g == 102) {
                                                              h = 1;
                                                              break a
                                                            }else {
                                                              if(g == 103) {
                                                                g = HEAP32[b + 52 >> 2] != 1 ? 104 : 115;
                                                                l:do {
                                                                  if(g == 104) {
                                                                    j = _h264bsdDecodeExpGolombSigned(a, l);
                                                                    g = j != 0 ? 105 : 106;
                                                                    do {
                                                                      if(g == 105) {
                                                                        h = j;
                                                                        break a
                                                                      }else {
                                                                        if(g == 106) {
                                                                          g = HEAP32[l >> 2] < -6 ? 108 : 107;
                                                                          n:do {
                                                                            if(g == 107) {
                                                                              if(HEAP32[l >> 2] > 6) {
                                                                                break n
                                                                              }
                                                                              HEAP32[b + 56 >> 2] = HEAP32[l >> 2] << 1;
                                                                              j = _h264bsdDecodeExpGolombSigned(a, l);
                                                                              g = j != 0 ? 110 : 111;
                                                                              do {
                                                                                if(g == 110) {
                                                                                  h = j;
                                                                                  break a
                                                                                }else {
                                                                                  if(g == 111) {
                                                                                    g = HEAP32[l >> 2] < -6 ? 113 : 112;
                                                                                    p:do {
                                                                                      if(g == 112) {
                                                                                        if(HEAP32[l >> 2] > 6) {
                                                                                          break p
                                                                                        }
                                                                                        HEAP32[b + 60 >> 2] = HEAP32[l >> 2] << 1;
                                                                                        g = 115;
                                                                                        break l
                                                                                      }
                                                                                    }while(0);
                                                                                    h = 1;
                                                                                    break a
                                                                                  }
                                                                                }
                                                                              }while(0)
                                                                            }
                                                                          }while(0);
                                                                          h = 1;
                                                                          break a
                                                                        }
                                                                      }
                                                                    }while(0)
                                                                  }
                                                                }while(0)
                                                              }
                                                            }
                                                          }while(0)
                                                        }
                                                      }
                                                    }while(0)
                                                  }
                                                }while(0);
                                                g = HEAPU32[d + 12 >> 2] > 1 ? 117 : 124;
                                                i:do {
                                                  if(g == 117) {
                                                    if(!(HEAPU32[d + 16 >> 2] >= 3)) {
                                                      break i
                                                    }
                                                    if(!(HEAPU32[d + 16 >> 2] <= 5)) {
                                                      break i
                                                    }
                                                    j = _NumSliceGroupChangeCycleBits(k, HEAP32[d + 36 >> 2]);
                                                    c = _h264bsdGetBits(a, j);
                                                    HEAP32[f >> 2] = c;
                                                    g = HEAP32[f >> 2] == -1 ? 120 : 121;
                                                    do {
                                                      if(g == 120) {
                                                        h = 1;
                                                        break a
                                                      }else {
                                                        if(g == 121) {
                                                          HEAP32[b + 64 >> 2] = HEAP32[f >> 2];
                                                          j = Math.floor((k + HEAP32[d + 36 >> 2] - 1) / HEAPU32[d + 36 >> 2]);
                                                          g = HEAPU32[b + 64 >> 2] > j ? 122 : 123;
                                                          do {
                                                            if(g == 122) {
                                                              h = 1;
                                                              break a
                                                            }
                                                          }while(0)
                                                        }
                                                      }
                                                    }while(0)
                                                  }
                                                }while(0);
                                                h = 0;
                                                break a
                                              }
                                            }while(0);
                                            h = 1
                                          }
                                        }
                                      }while(0)
                                    }
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = f;
  return h
}
_h264bsdDecodeSliceHeader.X = 1;
function _NumSliceGroupChangeCycleBits(a, b) {
  var c, d;
  c = a % b != 0 ? 1 : 2;
  c == 1 ? d = Math.floor(a / b) + 2 : c == 2 && (d = Math.floor(a / b) + 1);
  c = 0;
  a:for(;;) {
    var e = c + 1;
    c = e;
    if((d & -1 << e) == 0) {
      break a
    }
  }
  c -= 1;
  ((d & (1 << c) - 1) != 0 ? 7 : 8) == 7 && (c += 1);
  return c
}
_NumSliceGroupChangeCycleBits.X = 1;
function _RefPicListReordering(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 8;
  var f, g, h, j = e + 4;
  h = _h264bsdGetBits(a, 1);
  f = h == -1 ? 1 : 2;
  a:do {
    if(f == 1) {
      g = 1
    }else {
      if(f == 2) {
        HEAP32[b >> 2] = h;
        f = HEAP32[b >> 2] != 0 ? 3 : 27;
        do {
          if(f == 3) {
            g = 0;
            c:for(;;) {
              if(g > c) {
                f = 5;
                break c
              }
              h = _h264bsdDecodeExpGolombUnsigned(a, j);
              if(h != 0) {
                f = 7;
                break c
              }
              if(HEAPU32[j >> 2] > 3) {
                f = 9;
                break c
              }
              HEAP32[b + 4 + g * 12 >> 2] = HEAP32[j >> 2];
              f = HEAP32[j >> 2] == 0 ? 12 : 11;
              d:do {
                if(f == 11) {
                  if(HEAP32[j >> 2] == 1) {
                    f = 12;
                    break d
                  }
                  f = HEAP32[j >> 2] == 2 ? 18 : 21;
                  do {
                    if(f == 18) {
                      h = _h264bsdDecodeExpGolombUnsigned(a, e);
                      if(h != 0) {
                        f = 19;
                        break c
                      }
                      HEAP32[b + 4 + g * 12 + 8 >> 2] = HEAP32[e >> 2]
                    }
                  }while(0);
                  f = 22;
                  break d
                }
              }while(0);
              do {
                if(f == 12) {
                  h = _h264bsdDecodeExpGolombUnsigned(a, e);
                  if(h != 0) {
                    f = 13;
                    break c
                  }
                  if(HEAPU32[e >> 2] >= d) {
                    f = 15;
                    break c
                  }
                  HEAP32[b + 4 + g * 12 + 4 >> 2] = HEAP32[e >> 2] + 1
                }
              }while(0);
              g += 1;
              if(HEAP32[j >> 2] == 3) {
                f = 24;
                break c
              }
            }
            do {
              if(f == 5) {
                g = 1;
                break a
              }else {
                if(f == 7) {
                  g = h;
                  break a
                }else {
                  if(f == 9) {
                    g = 1;
                    break a
                  }else {
                    if(f == 13) {
                      g = h;
                      break a
                    }else {
                      if(f == 15) {
                        g = 1;
                        break a
                      }else {
                        if(f == 24) {
                          f = g == 1 ? 25 : 26;
                          do {
                            if(f == 25) {
                              g = 1;
                              break a
                            }
                          }while(0)
                        }else {
                          if(f == 19) {
                            g = h;
                            break a
                          }
                        }
                      }
                    }
                  }
                }
              }
            }while(0)
          }
        }while(0);
        g = 0
      }
    }
  }while(0);
  STACKTOP = e;
  return g
}
_RefPicListReordering.X = 1;
function _DecRefPicMarking(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 8;
  var f, g, h, j = e + 4, l, k, m, n;
  n = m = k = l = 0;
  c = c == 5 ? 1 : 9;
  a:do {
    if(c == 1) {
      g = _h264bsdGetBits(a, 1);
      c = g == -1 ? 2 : 3;
      do {
        if(c == 2) {
          f = 1;
          c = 60;
          break a
        }else {
          if(c == 3) {
            HEAP32[b >> 2] = g;
            g = _h264bsdGetBits(a, 1);
            c = g == -1 ? 4 : 5;
            do {
              if(c == 4) {
                f = 1;
                c = 60;
                break a
              }else {
                if(c == 5) {
                  HEAP32[b + 4 >> 2] = g;
                  c = d != 0 ? 8 : 6;
                  d:do {
                    if(c == 6) {
                      if(HEAP32[b + 4 >> 2] == 0) {
                        break d
                      }
                      f = 1;
                      c = 60;
                      break a
                    }
                  }while(0);
                  c = 59;
                  break a
                }
              }
            }while(0)
          }
        }
      }while(0)
    }else {
      if(c == 9) {
        g = _h264bsdGetBits(a, 1);
        c = g == -1 ? 10 : 11;
        do {
          if(c == 10) {
            f = 1;
            c = 60;
            break a
          }else {
            if(c == 11) {
              HEAP32[b + 8 >> 2] = g;
              c = HEAP32[b + 8 >> 2] != 0 ? 12 : 58;
              c:do {
                if(c == 12) {
                  h = 0;
                  d:for(;;) {
                    if(h > (d << 1) + 2) {
                      c = 14;
                      break d
                    }
                    g = _h264bsdDecodeExpGolombUnsigned(a, j);
                    if(g != 0) {
                      c = 16;
                      break d
                    }
                    if(HEAPU32[j >> 2] > 6) {
                      c = 18;
                      break d
                    }
                    HEAP32[b + 12 + h * 20 >> 2] = HEAP32[j >> 2];
                    c = HEAP32[j >> 2] == 1 ? 21 : 20;
                    e:do {
                      if(c == 20) {
                        c = HEAP32[j >> 2] == 3 ? 21 : 24;
                        break e
                      }
                    }while(0);
                    do {
                      if(c == 21) {
                        g = _h264bsdDecodeExpGolombUnsigned(a, e);
                        if(g != 0) {
                          c = 22;
                          break d
                        }
                        HEAP32[b + 12 + h * 20 + 4 >> 2] = HEAP32[e >> 2] + 1
                      }
                    }while(0);
                    c = HEAP32[j >> 2] == 2 ? 25 : 28;
                    do {
                      if(c == 25) {
                        g = _h264bsdDecodeExpGolombUnsigned(a, e);
                        if(g != 0) {
                          c = 26;
                          break d
                        }
                        HEAP32[b + 12 + h * 20 + 8 >> 2] = HEAP32[e >> 2]
                      }
                    }while(0);
                    c = HEAP32[j >> 2] == 3 ? 30 : 29;
                    e:do {
                      if(c == 29) {
                        c = HEAP32[j >> 2] == 6 ? 30 : 33;
                        break e
                      }
                    }while(0);
                    do {
                      if(c == 30) {
                        g = _h264bsdDecodeExpGolombUnsigned(a, e);
                        if(g != 0) {
                          c = 31;
                          break d
                        }
                        HEAP32[b + 12 + h * 20 + 12 >> 2] = HEAP32[e >> 2]
                      }
                    }while(0);
                    c = HEAP32[j >> 2] == 4 ? 34 : 42;
                    do {
                      if(c == 34) {
                        g = _h264bsdDecodeExpGolombUnsigned(a, e);
                        if(g != 0) {
                          c = 35;
                          break d
                        }
                        if(HEAPU32[e >> 2] > d) {
                          c = 37;
                          break d
                        }
                        c = HEAP32[e >> 2] == 0 ? 39 : 40;
                        c == 39 ? HEAP32[b + 12 + h * 20 + 16 >> 2] = 65535 : c == 40 && (HEAP32[b + 12 + h * 20 + 16 >> 2] = HEAP32[e >> 2] - 1);
                        l += 1
                      }
                    }while(0);
                    c = HEAP32[j >> 2] == 5 ? 43 : 44;
                    c == 43 && (k += 1);
                    c = HEAP32[j >> 2] != 0 ? 45 : 47;
                    e:do {
                      if(c == 45) {
                        if(!(HEAPU32[j >> 2] <= 3)) {
                          break e
                        }
                        n += 1
                      }
                    }while(0);
                    c = HEAP32[j >> 2] == 6 ? 48 : 49;
                    c == 48 && (m += 1);
                    h += 1;
                    if(HEAP32[j >> 2] == 0) {
                      c = 51;
                      break d
                    }
                  }
                  do {
                    if(c == 14) {
                      f = 1;
                      c = 60;
                      break a
                    }else {
                      if(c == 16) {
                        f = g;
                        c = 60;
                        break a
                      }else {
                        if(c == 18) {
                          f = 1;
                          c = 60;
                          break a
                        }else {
                          if(c == 22) {
                            f = g;
                            c = 60;
                            break a
                          }else {
                            if(c == 26) {
                              f = g;
                              c = 60;
                              break a
                            }else {
                              if(c == 31) {
                                f = g;
                                c = 60;
                                break a
                              }else {
                                if(c == 35) {
                                  f = g;
                                  c = 60;
                                  break a
                                }else {
                                  if(c == 37) {
                                    f = 1;
                                    c = 60;
                                    break a
                                  }else {
                                    if(c == 51) {
                                      c = l > 1 ? 56 : 52;
                                      e:do {
                                        if(c == 52) {
                                          if(k > 1) {
                                            break e
                                          }
                                          if(m > 1) {
                                            break e
                                          }
                                          c = n != 0 ? 55 : 57;
                                          do {
                                            if(c == 55 && k != 0) {
                                              break e
                                            }
                                          }while(0);
                                          break c
                                        }
                                      }while(0);
                                      f = 1;
                                      c = 60;
                                      break a
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }while(0)
                }
              }while(0);
              c = 59;
              break a
            }
          }
        }while(0)
      }
    }
  }while(0);
  c == 59 && (f = 0);
  STACKTOP = e;
  return f
}
_DecRefPicMarking.X = 1;
function _h264bsdCheckPpsId(a, b) {
  var c = STACKTOP;
  STACKTOP += 24;
  var d, e, f, g = c + 4, h, j;
  d = a;
  f = g;
  h = d + 20;
  if(f % 4 == d % 4) {
    for(;d % 4 !== 0 && d < h;) {
      HEAP8[f++] = HEAP8[d++]
    }
    d >>= 2;
    f >>= 2;
    for(j = h >> 2;d < j;) {
      HEAP32[f++] = HEAP32[d++]
    }
    d <<= 2;
    f <<= 2
  }
  for(;d < h;) {
    HEAP8[f++] = HEAP8[d++]
  }
  f = _h264bsdDecodeExpGolombUnsigned(g, c);
  d = f != 0 ? 1 : 2;
  d == 1 ? e = f : d == 2 && (f = _h264bsdDecodeExpGolombUnsigned(g, c), d = f != 0 ? 3 : 4, d == 3 ? e = f : d == 4 && (f = _h264bsdDecodeExpGolombUnsigned(g, c), d = f != 0 ? 5 : 6, d == 5 ? e = f : d == 6 && (d = HEAPU32[c >> 2] >= 256 ? 7 : 8, d == 7 ? e = 1 : d == 8 && (HEAP32[b >> 2] = HEAP32[c >> 2], e = 0))));
  STACKTOP = c;
  return e
}
_h264bsdCheckPpsId.X = 1;
function _h264bsdCheckFrameNum(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 24;
  var e, f, g = d + 4, h, j;
  f = g;
  h = a + 20;
  if(f % 4 == a % 4) {
    for(;a % 4 !== 0 && a < h;) {
      HEAP8[f++] = HEAP8[a++]
    }
    a >>= 2;
    f >>= 2;
    for(j = h >> 2;a < j;) {
      HEAP32[f++] = HEAP32[a++]
    }
    a <<= 2;
    f <<= 2
  }
  for(;a < h;) {
    HEAP8[f++] = HEAP8[a++]
  }
  f = _h264bsdDecodeExpGolombUnsigned(g, d);
  a = f != 0 ? 1 : 2;
  do {
    if(a == 1) {
      e = f
    }else {
      if(a == 2) {
        f = _h264bsdDecodeExpGolombUnsigned(g, d);
        a = f != 0 ? 3 : 4;
        do {
          if(a == 3) {
            e = f
          }else {
            if(a == 4) {
              f = _h264bsdDecodeExpGolombUnsigned(g, d);
              a = f != 0 ? 5 : 6;
              do {
                if(a == 5) {
                  e = f
                }else {
                  if(a == 6) {
                    a = 0;
                    d:for(;;) {
                      if(b >>> a == 0) {
                        break d
                      }
                      a += 1
                    }
                    a -= 1;
                    f = _h264bsdGetBits(g, a);
                    a = f == -1 ? 10 : 11;
                    a == 10 ? e = 1 : a == 11 && (HEAP32[c >> 2] = f, e = 0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = d;
  return e
}
_h264bsdCheckFrameNum.X = 1;
function _h264bsdCheckIdrPicId(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 24;
  var f, g, h = e + 4, c = c != 5 ? 1 : 2;
  do {
    if(c == 1) {
      f = 1
    }else {
      if(c == 2) {
        g = h;
        var j, l, c = a;
        j = c + 20;
        if(g % 4 == c % 4) {
          for(;c % 4 !== 0 && c < j;) {
            HEAP8[g++] = HEAP8[c++]
          }
          c >>= 2;
          g >>= 2;
          for(l = j >> 2;c < l;) {
            HEAP32[g++] = HEAP32[c++]
          }
          c <<= 2;
          g <<= 2
        }
        for(;c < j;) {
          HEAP8[g++] = HEAP8[c++]
        }
        g = _h264bsdDecodeExpGolombUnsigned(h, e);
        c = g != 0 ? 3 : 4;
        do {
          if(c == 3) {
            f = g
          }else {
            if(c == 4) {
              g = _h264bsdDecodeExpGolombUnsigned(h, e);
              c = g != 0 ? 5 : 6;
              do {
                if(c == 5) {
                  f = g
                }else {
                  if(c == 6) {
                    g = _h264bsdDecodeExpGolombUnsigned(h, e);
                    c = g != 0 ? 7 : 8;
                    do {
                      if(c == 7) {
                        f = g
                      }else {
                        if(c == 8) {
                          c = 0;
                          e:for(;;) {
                            if(b >>> c == 0) {
                              break e
                            }
                            c += 1
                          }
                          c -= 1;
                          g = _h264bsdGetBits(h, c);
                          c = g == -1 ? 12 : 13;
                          c == 12 ? f = 1 : c == 13 && (g = _h264bsdDecodeExpGolombUnsigned(h, d), c = g != 0 ? 14 : 15, c == 14 ? f = g : c == 15 && (f = 0))
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = e;
  return f
}
_h264bsdCheckIdrPicId.X = 1;
function _h264bsdCheckPicOrderCntLsb(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 24;
  var f, g, h = e + 4, j, l;
  g = h;
  j = a + 20;
  if(g % 4 == a % 4) {
    for(;a % 4 !== 0 && a < j;) {
      HEAP8[g++] = HEAP8[a++]
    }
    a >>= 2;
    g >>= 2;
    for(l = j >> 2;a < l;) {
      HEAP32[g++] = HEAP32[a++]
    }
    a <<= 2;
    g <<= 2
  }
  for(;a < j;) {
    HEAP8[g++] = HEAP8[a++]
  }
  g = _h264bsdDecodeExpGolombUnsigned(h, e);
  a = g != 0 ? 1 : 2;
  a:do {
    if(a == 1) {
      f = g
    }else {
      if(a == 2) {
        g = _h264bsdDecodeExpGolombUnsigned(h, e);
        a = g != 0 ? 3 : 4;
        do {
          if(a == 3) {
            f = g
          }else {
            if(a == 4) {
              g = _h264bsdDecodeExpGolombUnsigned(h, e);
              a = g != 0 ? 5 : 6;
              do {
                if(a == 5) {
                  f = g
                }else {
                  if(a == 6) {
                    a = 0;
                    d:for(;;) {
                      if(HEAPU32[b + 12 >> 2] >>> a == 0) {
                        break d
                      }
                      a += 1
                    }
                    a -= 1;
                    g = _h264bsdGetBits(h, a);
                    a = g == -1 ? 10 : 11;
                    do {
                      if(a == 10) {
                        f = 1
                      }else {
                        if(a == 11) {
                          a = c == 5 ? 12 : 15;
                          do {
                            if(a == 12) {
                              g = _h264bsdDecodeExpGolombUnsigned(h, e);
                              a = g != 0 ? 13 : 14;
                              do {
                                if(a == 13) {
                                  f = g;
                                  break a
                                }
                              }while(0)
                            }
                          }while(0);
                          a = 0;
                          e:for(;;) {
                            if(HEAPU32[b + 20 >> 2] >>> a == 0) {
                              break e
                            }
                            a += 1
                          }
                          a -= 1;
                          g = _h264bsdGetBits(h, a);
                          a = g == -1 ? 19 : 20;
                          a == 19 ? f = 1 : a == 20 && (HEAP32[d >> 2] = g, f = 0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = e;
  return f
}
_h264bsdCheckPicOrderCntLsb.X = 1;
function _h264bsdCheckDeltaPicOrderCntBottom(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 24;
  var f, g, h = e + 4, j, l;
  g = h;
  j = a + 20;
  if(g % 4 == a % 4) {
    for(;a % 4 !== 0 && a < j;) {
      HEAP8[g++] = HEAP8[a++]
    }
    a >>= 2;
    g >>= 2;
    for(l = j >> 2;a < l;) {
      HEAP32[g++] = HEAP32[a++]
    }
    a <<= 2;
    g <<= 2
  }
  for(;a < j;) {
    HEAP8[g++] = HEAP8[a++]
  }
  g = _h264bsdDecodeExpGolombUnsigned(h, e);
  a = g != 0 ? 1 : 2;
  a:do {
    if(a == 1) {
      f = g
    }else {
      if(a == 2) {
        g = _h264bsdDecodeExpGolombUnsigned(h, e);
        a = g != 0 ? 3 : 4;
        do {
          if(a == 3) {
            f = g
          }else {
            if(a == 4) {
              g = _h264bsdDecodeExpGolombUnsigned(h, e);
              a = g != 0 ? 5 : 6;
              do {
                if(a == 5) {
                  f = g
                }else {
                  if(a == 6) {
                    a = 0;
                    d:for(;;) {
                      if(HEAPU32[b + 12 >> 2] >>> a == 0) {
                        break d
                      }
                      a += 1
                    }
                    a -= 1;
                    g = _h264bsdGetBits(h, a);
                    a = g == -1 ? 10 : 11;
                    do {
                      if(a == 10) {
                        f = 1
                      }else {
                        if(a == 11) {
                          a = c == 5 ? 12 : 15;
                          do {
                            if(a == 12) {
                              g = _h264bsdDecodeExpGolombUnsigned(h, e);
                              a = g != 0 ? 13 : 14;
                              do {
                                if(a == 13) {
                                  f = g;
                                  break a
                                }
                              }while(0)
                            }
                          }while(0);
                          a = 0;
                          e:for(;;) {
                            if(HEAPU32[b + 20 >> 2] >>> a == 0) {
                              break e
                            }
                            a += 1
                          }
                          a -= 1;
                          g = _h264bsdGetBits(h, a);
                          a = g == -1 ? 19 : 20;
                          a == 19 ? f = 1 : a == 20 && (g = _h264bsdDecodeExpGolombSigned(h, d), a = g != 0 ? 21 : 22, a == 21 ? f = g : a == 22 && (f = 0))
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = e;
  return f
}
_h264bsdCheckDeltaPicOrderCntBottom.X = 1;
function _h264bsdCheckDeltaPicOrderCnt(a, b, c, d, e) {
  var f = STACKTOP;
  STACKTOP += 24;
  var g, h, j = f + 4, l, k;
  h = j;
  l = a + 20;
  if(h % 4 == a % 4) {
    for(;a % 4 !== 0 && a < l;) {
      HEAP8[h++] = HEAP8[a++]
    }
    a >>= 2;
    h >>= 2;
    for(k = l >> 2;a < k;) {
      HEAP32[h++] = HEAP32[a++]
    }
    a <<= 2;
    h <<= 2
  }
  for(;a < l;) {
    HEAP8[h++] = HEAP8[a++]
  }
  h = _h264bsdDecodeExpGolombUnsigned(j, f);
  a = h != 0 ? 1 : 2;
  a:do {
    if(a == 1) {
      g = h
    }else {
      if(a == 2) {
        h = _h264bsdDecodeExpGolombUnsigned(j, f);
        a = h != 0 ? 3 : 4;
        do {
          if(a == 3) {
            g = h
          }else {
            if(a == 4) {
              h = _h264bsdDecodeExpGolombUnsigned(j, f);
              a = h != 0 ? 5 : 6;
              do {
                if(a == 5) {
                  g = h
                }else {
                  if(a == 6) {
                    a = 0;
                    d:for(;;) {
                      if(HEAPU32[b + 12 >> 2] >>> a == 0) {
                        break d
                      }
                      a += 1
                    }
                    a -= 1;
                    h = _h264bsdGetBits(j, a);
                    a = h == -1 ? 10 : 11;
                    do {
                      if(a == 10) {
                        g = 1
                      }else {
                        if(a == 11) {
                          a = c == 5 ? 12 : 15;
                          do {
                            if(a == 12) {
                              h = _h264bsdDecodeExpGolombUnsigned(j, f);
                              a = h != 0 ? 13 : 14;
                              do {
                                if(a == 13) {
                                  g = h;
                                  break a
                                }
                              }while(0)
                            }
                          }while(0);
                          h = _h264bsdDecodeExpGolombSigned(j, e);
                          a = h != 0 ? 16 : 17;
                          do {
                            if(a == 16) {
                              g = h
                            }else {
                              if(a == 17) {
                                a = d != 0 ? 18 : 21;
                                do {
                                  if(a == 18) {
                                    h = _h264bsdDecodeExpGolombSigned(j, e + 4);
                                    a = h != 0 ? 19 : 20;
                                    do {
                                      if(a == 19) {
                                        g = h;
                                        break a
                                      }
                                    }while(0)
                                  }
                                }while(0);
                                g = 0
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = f;
  return g
}
_h264bsdCheckDeltaPicOrderCnt.X = 1;
function _h264bsdCheckRedundantPicCnt(a, b, c, d, e) {
  var f = STACKTOP;
  STACKTOP += 28;
  var g, h, j = f + 4, l = f + 8, k, m;
  h = l;
  k = a + 20;
  if(h % 4 == a % 4) {
    for(;a % 4 !== 0 && a < k;) {
      HEAP8[h++] = HEAP8[a++]
    }
    a >>= 2;
    h >>= 2;
    for(m = k >> 2;a < m;) {
      HEAP32[h++] = HEAP32[a++]
    }
    a <<= 2;
    h <<= 2
  }
  for(;a < k;) {
    HEAP8[h++] = HEAP8[a++]
  }
  h = _h264bsdDecodeExpGolombUnsigned(l, f);
  a = h != 0 ? 1 : 2;
  a:do {
    if(a == 1) {
      g = h
    }else {
      if(a == 2) {
        h = _h264bsdDecodeExpGolombUnsigned(l, f);
        a = h != 0 ? 3 : 4;
        do {
          if(a == 3) {
            g = h
          }else {
            if(a == 4) {
              h = _h264bsdDecodeExpGolombUnsigned(l, f);
              a = h != 0 ? 5 : 6;
              do {
                if(a == 5) {
                  g = h
                }else {
                  if(a == 6) {
                    a = 0;
                    d:for(;;) {
                      if(HEAPU32[b + 12 >> 2] >>> a == 0) {
                        break d
                      }
                      a += 1
                    }
                    a -= 1;
                    h = _h264bsdGetBits(l, a);
                    a = h == -1 ? 10 : 11;
                    do {
                      if(a == 10) {
                        g = 1
                      }else {
                        if(a == 11) {
                          a = d == 5 ? 12 : 15;
                          do {
                            if(a == 12) {
                              h = _h264bsdDecodeExpGolombUnsigned(l, f);
                              a = h != 0 ? 13 : 14;
                              do {
                                if(a == 13) {
                                  g = h;
                                  break a
                                }
                              }while(0)
                            }
                          }while(0);
                          a = HEAP32[b + 16 >> 2] == 0 ? 16 : 26;
                          do {
                            if(a == 16) {
                              a = 0;
                              f:for(;;) {
                                if(HEAPU32[b + 20 >> 2] >>> a == 0) {
                                  break f
                                }
                                a += 1
                              }
                              a -= 1;
                              h = _h264bsdGetBits(l, a);
                              a = h == -1 ? 20 : 21;
                              do {
                                if(a == 20) {
                                  g = 1;
                                  break a
                                }else {
                                  if(a == 21) {
                                    a = HEAP32[c + 8 >> 2] != 0 ? 22 : 25;
                                    do {
                                      if(a == 22) {
                                        h = _h264bsdDecodeExpGolombSigned(l, j);
                                        a = h != 0 ? 23 : 24;
                                        do {
                                          if(a == 23) {
                                            g = h;
                                            break a
                                          }
                                        }while(0)
                                      }
                                    }while(0)
                                  }
                                }
                              }while(0)
                            }
                          }while(0);
                          a = HEAP32[b + 16 >> 2] == 1 ? 27 : 35;
                          e:do {
                            if(a == 27) {
                              if(HEAP32[b + 24 >> 2] != 0) {
                                break e
                              }
                              h = _h264bsdDecodeExpGolombSigned(l, j);
                              a = h != 0 ? 29 : 30;
                              do {
                                if(a == 29) {
                                  g = h;
                                  break a
                                }else {
                                  if(a == 30) {
                                    a = HEAP32[c + 8 >> 2] != 0 ? 31 : 34;
                                    do {
                                      if(a == 31) {
                                        h = _h264bsdDecodeExpGolombSigned(l, j);
                                        a = h != 0 ? 32 : 33;
                                        do {
                                          if(a == 32) {
                                            g = h;
                                            break a
                                          }
                                        }while(0)
                                      }
                                    }while(0)
                                  }
                                }
                              }while(0)
                            }
                          }while(0);
                          h = _h264bsdDecodeExpGolombUnsigned(l, e);
                          a = h != 0 ? 36 : 37;
                          a == 36 ? g = h : a == 37 && (g = 0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = f;
  return g
}
_h264bsdCheckRedundantPicCnt.X = 1;
function _SetMbParams(a, b, c, d) {
  var e, f;
  e = HEAP32[b + 52 >> 2];
  f = HEAP32[b + 56 >> 2];
  b = HEAP32[b + 60 >> 2];
  HEAP32[a + 4 >> 2] = c;
  HEAP32[a + 8 >> 2] = e;
  HEAP32[a + 12 >> 2] = f;
  HEAP32[a + 16 >> 2] = b;
  HEAP32[a + 24 >> 2] = d
}
function _h264bsdCheckPriorPicsFlag(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 28;
  var f, g, h = e + 4, j = e + 8, l, k;
  f = j;
  l = b + 20;
  if(f % 4 == b % 4) {
    for(;b % 4 !== 0 && b < l;) {
      HEAP8[f++] = HEAP8[b++]
    }
    b >>= 2;
    f >>= 2;
    for(k = l >> 2;b < k;) {
      HEAP32[f++] = HEAP32[b++]
    }
    b <<= 2;
    f <<= 2
  }
  for(;b < l;) {
    HEAP8[f++] = HEAP8[b++]
  }
  b = _h264bsdDecodeExpGolombUnsigned(j, e);
  f = b != 0 ? 1 : 2;
  a:do {
    if(f == 1) {
      g = b
    }else {
      if(f == 2) {
        b = _h264bsdDecodeExpGolombUnsigned(j, e);
        f = b != 0 ? 3 : 4;
        do {
          if(f == 3) {
            g = b
          }else {
            if(f == 4) {
              b = _h264bsdDecodeExpGolombUnsigned(j, e);
              f = b != 0 ? 5 : 6;
              do {
                if(f == 5) {
                  g = b
                }else {
                  if(f == 6) {
                    b = 0;
                    d:for(;;) {
                      if(HEAPU32[c + 12 >> 2] >>> b == 0) {
                        break d
                      }
                      b += 1
                    }
                    b -= 1;
                    b = _h264bsdGetBits(j, b);
                    f = b == -1 ? 10 : 11;
                    do {
                      if(f == 10) {
                        g = 1
                      }else {
                        if(f == 11) {
                          b = _h264bsdDecodeExpGolombUnsigned(j, e);
                          f = b != 0 ? 12 : 13;
                          do {
                            if(f == 12) {
                              g = b
                            }else {
                              if(f == 13) {
                                f = HEAP32[c + 16 >> 2] == 0 ? 14 : 24;
                                do {
                                  if(f == 14) {
                                    b = 0;
                                    g:for(;;) {
                                      if(HEAPU32[c + 20 >> 2] >>> b == 0) {
                                        break g
                                      }
                                      b += 1
                                    }
                                    b -= 1;
                                    b = _h264bsdGetBits(j, b);
                                    f = b == -1 ? 18 : 19;
                                    do {
                                      if(f == 18) {
                                        g = 1;
                                        break a
                                      }else {
                                        if(f == 19) {
                                          f = HEAP32[d + 8 >> 2] != 0 ? 20 : 23;
                                          do {
                                            if(f == 20) {
                                              b = _h264bsdDecodeExpGolombSigned(j, h);
                                              f = b != 0 ? 21 : 22;
                                              do {
                                                if(f == 21) {
                                                  g = b;
                                                  break a
                                                }
                                              }while(0)
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }while(0);
                                f = HEAP32[c + 16 >> 2] == 1 ? 25 : 33;
                                f:do {
                                  if(f == 25) {
                                    if(HEAP32[c + 24 >> 2] != 0) {
                                      break f
                                    }
                                    b = _h264bsdDecodeExpGolombSigned(j, h);
                                    f = b != 0 ? 27 : 28;
                                    do {
                                      if(f == 27) {
                                        g = b;
                                        break a
                                      }else {
                                        if(f == 28) {
                                          f = HEAP32[d + 8 >> 2] != 0 ? 29 : 32;
                                          do {
                                            if(f == 29) {
                                              b = _h264bsdDecodeExpGolombSigned(j, h);
                                              f = b != 0 ? 30 : 31;
                                              do {
                                                if(f == 30) {
                                                  g = b;
                                                  break a
                                                }
                                              }while(0)
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }while(0);
                                f = HEAP32[d + 68 >> 2] != 0 ? 34 : 37;
                                do {
                                  if(f == 34) {
                                    b = _h264bsdDecodeExpGolombUnsigned(j, e);
                                    f = b != 0 ? 35 : 36;
                                    do {
                                      if(f == 35) {
                                        g = b;
                                        break a
                                      }
                                    }while(0)
                                  }
                                }while(0);
                                f = _h264bsdGetBits(j, 1);
                                HEAP32[a >> 2] = f;
                                f = HEAP32[a >> 2] == -1 ? 38 : 39;
                                f == 38 ? g = 1 : f == 39 && (g = 0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  STACKTOP = e;
  return g
}
_h264bsdCheckPriorPicsFlag.X = 1;
function _h264bsdDecodeSliceData(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 440;
  var f, g, h, j, l = e + 432, k, m, n, q, p = e + 436, o;
  h = e + Math.floor(16 - e & 15);
  o = HEAP32[b + 3376 >> 2];
  m = HEAP32[d >> 2];
  k = HEAP32[l >> 2] = 0;
  HEAP32[b + 1192 >> 2] += 1;
  q = HEAP32[b + 1200 >> 2] = 0;
  HEAP32[p >> 2] = HEAP32[HEAP32[b + 12 >> 2] + 52 >> 2] + HEAP32[d + 48 >> 2];
  a:for(;;) {
    f = HEAP32[d + 36 >> 2] != 0 ? 4 : 2;
    do {
      if(f == 2 && HEAP32[HEAP32[b + 1212 >> 2] + m * 216 + 196 >> 2] != 0) {
        f = 3;
        break a
      }
    }while(0);
    _SetMbParams(HEAP32[b + 1212 >> 2] + m * 216, d, HEAP32[b + 1192 >> 2], HEAP32[HEAP32[b + 12 >> 2] + 56 >> 2]);
    f = HEAP32[d + 4 >> 2] == 2 ? 15 : 5;
    b:do {
      if(f == 5) {
        if(HEAP32[d + 4 >> 2] == 7) {
          break b
        }
        f = k != 0 ? 14 : 7;
        do {
          if(f == 7) {
            j = _h264bsdDecodeExpGolombUnsigned(a, l);
            if(j != 0) {
              f = 8;
              break a
            }
            if(HEAPU32[l >> 2] > HEAP32[b + 1176 >> 2] - m) {
              f = 10;
              break a
            }
            f = HEAP32[l >> 2] != 0 ? 12 : 13;
            f == 12 && (k = 1, _H264SwDecMemset(o + 12, 0, 164), HEAP32[o >> 2] = 0)
          }
        }while(0)
      }
    }while(0);
    f = HEAP32[l >> 2] != 0 ? 16 : 17;
    do {
      if(f == 16) {
        HEAP32[l >> 2] -= 1
      }else {
        if(f == 17 && (k = 0, j = _h264bsdDecodeMacroblockLayer(a, o, HEAP32[b + 1212 >> 2] + m * 216, HEAP32[d + 4 >> 2], HEAP32[d + 44 >> 2]), j != 0)) {
          f = 18;
          break a
        }
      }
    }while(0);
    j = _h264bsdDecodeMacroblock(HEAP32[b + 1212 >> 2] + m * 216, o, c, b + 1220, p, m, HEAP32[HEAP32[b + 12 >> 2] + 64 >> 2], h);
    if(j != 0) {
      f = 21;
      break a
    }
    f = HEAP32[HEAP32[b + 1212 >> 2] + m * 216 + 196 >> 2] == 1 ? 23 : 24;
    f == 23 && (q += 1);
    if(_h264bsdMoreRbspData(a) != 0) {
      var r = 1;
      f = 26
    }else {
      f = 25
    }
    f == 25 && (r = HEAP32[l >> 2] != 0);
    n = r ? 1 : 0;
    f = HEAP32[d + 4 >> 2] == 2 ? 28 : 27;
    b:do {
      if(f == 27) {
        f = HEAP32[d + 4 >> 2] == 7 ? 28 : 29;
        break b
      }
    }while(0);
    f == 28 && (HEAP32[b + 1200 >> 2] = m);
    m = _h264bsdNextMbAddress(HEAP32[b + 1172 >> 2], HEAP32[b + 1176 >> 2], m);
    f = n != 0 ? 30 : 32;
    do {
      if(f == 30 && m == 0) {
        f = 31;
        break a
      }
    }while(0);
    if(n == 0) {
      f = 34;
      break a
    }
  }
  f == 3 ? g = 1 : f == 8 ? g = j : f == 10 ? g = 1 : f == 18 ? g = j : f == 21 ? g = j : f == 31 ? g = 1 : f == 34 && (f = HEAP32[b + 1196 >> 2] + q > HEAPU32[b + 1176 >> 2] ? 35 : 36, f == 35 ? g = 1 : f == 36 && (HEAP32[b + 1196 >> 2] += q, g = 0));
  STACKTOP = e;
  return g
}
_h264bsdDecodeSliceData.X = 1;
function _h264bsdMarkSliceCorrupted(a, b) {
  var c, d, e, f, g;
  g = b;
  f = HEAP32[a + 1192 >> 2];
  c = HEAP32[a + 1200 >> 2] != 0 ? 1 : 12;
  do {
    if(c == 1) {
      e = HEAP32[a + 1200 >> 2] - 1;
      d = 0;
      b:for(;;) {
        if(!(e > g)) {
          c = 11;
          break b
        }
        c = HEAP32[HEAP32[a + 1212 >> 2] + e * 216 + 4 >> 2] == f ? 4 : 10;
        do {
          if(c == 4) {
            d += 1;
            var h = d;
            c = HEAPU32[HEAP32[a + 16 >> 2] + 52 >> 2] > 10 ? 5 : 6;
            if(c == 5) {
              var j = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2]
            }else {
              c == 6 && (j = 10)
            }
            if(h >= j) {
              c = 8;
              break b
            }
          }
        }while(0);
        e -= 1
      }
      g = e
    }
  }while(0);
  a:for(;;) {
    if(HEAP32[HEAP32[a + 1212 >> 2] + g * 216 + 4 >> 2] != f) {
      break a
    }
    if(HEAP32[HEAP32[a + 1212 >> 2] + g * 216 + 196 >> 2] == 0) {
      break a
    }
    HEAP32[HEAP32[a + 1212 >> 2] + g * 216 + 196 >> 2] -= 1;
    g = _h264bsdNextMbAddress(HEAP32[a + 1172 >> 2], HEAP32[a + 1176 >> 2], g);
    if(g == 0) {
      break a
    }
  }
}
_h264bsdMarkSliceCorrupted.X = 1;
function _h264bsdNumMbPart(a) {
  var b, a = a == 1 ? 1 : a == 0 ? 1 : a == 2 ? 2 : a == 3 ? 2 : 3;
  a == 3 ? b = 4 : a == 1 ? b = 1 : a == 2 && (b = 2);
  return b
}
function _h264bsdMbPartPredMode(a) {
  var b, c;
  b = a <= 5 ? 1 : 2;
  b == 1 ? c = 2 : b == 2 && (b = a == 6 ? 3 : 4, b == 3 ? c = 0 : b == 4 && (c = 1));
  return c
}
function _CbpIntra16x16(a) {
  var b, c;
  b = a >= 19 ? 1 : 2;
  b == 1 ? c = 15 : b == 2 && (c = 0);
  a = a - 7 >>> 2;
  (a > 2 ? 4 : 5) == 4 && (a -= 3);
  c += a << 4;
  return c
}
function _h264bsdDecodeMacroblockLayer(a, b, c, d, e) {
  var f = STACKTOP;
  STACKTOP += 8;
  var g, h, j, l = f + 4;
  _H264SwDecMemset(b, 0, 2088);
  j = _h264bsdDecodeExpGolombUnsigned(a, f);
  g = d == 2 ? 2 : 1;
  a:do {
    if(g == 1) {
      if(d == 7) {
        g = 2;
        break a
      }
      g = HEAP32[f >> 2] + 1 > 31 ? 8 : 7;
      b:do {
        if(g == 7) {
          if(j != 0) {
            break b
          }
          HEAP32[b >> 2] = HEAP32[f >> 2] + 1;
          g = 10;
          break a
        }
      }while(0);
      h = 1;
      g = 45;
      break a
    }
  }while(0);
  a:do {
    if(g == 2) {
      g = HEAP32[f >> 2] + 6 > 31 ? 4 : 3;
      b:do {
        if(g == 3) {
          if(j != 0) {
            break b
          }
          HEAP32[b >> 2] = HEAP32[f >> 2] + 6;
          g = 10;
          break a
        }
      }while(0);
      h = 1;
      g = 45;
      break a
    }
  }while(0);
  a:do {
    if(g == 10) {
      g = HEAP32[b >> 2] == 31 ? 11 : 23;
      do {
        if(g == 11) {
          c:for(;;) {
            if(!(_h264bsdIsByteAligned(a) != 0 ^ 1)) {
              g = 16;
              break c
            }
            j = _h264bsdGetBits(a, 1);
            if(j != 0) {
              g = 14;
              break c
            }
          }
          do {
            if(g == 16) {
              h = b + 328;
              d = 0;
              d:for(;;) {
                if(!(d < 384)) {
                  g = 22;
                  break d
                }
                var k = _h264bsdGetBits(a, 8);
                HEAP32[f >> 2] = k;
                if(HEAP32[f >> 2] == -1) {
                  g = 19;
                  break d
                }
                var k = HEAP32[f >> 2], m = h;
                h = m + 4;
                HEAP32[m >> 2] = k;
                d += 1
              }
              do {
                if(g != 22 && g == 19) {
                  h = 1;
                  break a
                }
              }while(0)
            }else {
              if(g == 14) {
                h = 1;
                break a
              }
            }
          }while(0)
        }else {
          if(g == 23) {
            d = _h264bsdMbPartPredMode(HEAP32[b >> 2]);
            g = d == 2 ? 24 : 26;
            c:do {
              if(g == 24) {
                if(_h264bsdNumMbPart(HEAP32[b >> 2]) != 4) {
                  g = 26;
                  break c
                }
                j = _DecodeSubMbPred(a, b + 176, HEAP32[b >> 2], e);
                g = 27;
                break c
              }
            }while(0);
            g == 26 && (j = _DecodeMbPred(a, b + 12, HEAP32[b >> 2], e));
            g = j != 0 ? 28 : 29;
            do {
              if(g == 28) {
                h = j;
                break a
              }else {
                if(g == 29) {
                  g = d != 1 ? 30 : 33;
                  do {
                    if(g == 30) {
                      j = _h264bsdDecodeExpGolombMapped(a, f, d == 0);
                      g = j != 0 ? 31 : 32;
                      do {
                        if(g == 31) {
                          h = j;
                          break a
                        }else {
                          g == 32 && (HEAP32[b + 4 >> 2] = HEAP32[f >> 2])
                        }
                      }while(0)
                    }else {
                      g == 33 && (h = _CbpIntra16x16(HEAP32[b >> 2]), HEAP32[b + 4 >> 2] = h)
                    }
                  }while(0);
                  g = HEAP32[b + 4 >> 2] != 0 ? 36 : 35;
                  d:do {
                    if(g == 35) {
                      g = d == 1 ? 36 : 43;
                      break d
                    }
                  }while(0);
                  d:do {
                    if(g == 36) {
                      j = _h264bsdDecodeExpGolombSigned(a, l);
                      g = j != 0 ? 39 : 37;
                      e:do {
                        if(g == 37) {
                          if(HEAP32[l >> 2] < -26) {
                            break e
                          }
                          if(HEAP32[l >> 2] > 25) {
                            break e
                          }
                          HEAP32[b + 8 >> 2] = HEAP32[l >> 2];
                          j = _DecodeResidual(a, b + 272, c, HEAP32[b >> 2], HEAP32[b + 4 >> 2]);
                          HEAP32[a + 16 >> 2] = (HEAP32[a + 4 >> 2] - HEAP32[a >> 2] << 3) + HEAP32[a + 8 >> 2];
                          g = j != 0 ? 41 : 42;
                          do {
                            if(g == 41) {
                              h = j;
                              break a
                            }else {
                              if(g == 42) {
                                g = 43;
                                break d
                              }
                            }
                          }while(0)
                        }
                      }while(0);
                      h = 1;
                      break a
                    }
                  }while(0)
                }
              }
            }while(0)
          }
        }
      }while(0);
      h = 0
    }
  }while(0);
  STACKTOP = f;
  return h
}
_h264bsdDecodeMacroblockLayer.X = 1;
function _DecodeSubMbPred(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 8;
  var f, g, h, j, l, k = e + 4;
  j = 0;
  a:for(;;) {
    if(!(j < 4)) {
      f = 7;
      break a
    }
    h = _h264bsdDecodeExpGolombUnsigned(a, e);
    if(h != 0) {
      f = 4;
      break a
    }
    if(HEAPU32[e >> 2] > 3) {
      f = 4;
      break a
    }
    HEAP32[b + (j << 2) >> 2] = HEAP32[e >> 2];
    j += 1
  }
  a:do {
    if(f == 7) {
      f = d > 1 ? 8 : 17;
      b:do {
        if(f == 8) {
          if(c == 5) {
            f = 17;
            break b
          }
          j = 0;
          c:for(;;) {
            if(!(j < 4)) {
              f = 16;
              break c
            }
            h = _h264bsdDecodeExpGolombTruncated(a, e, d > 2);
            if(h != 0) {
              f = 13;
              break c
            }
            if(HEAPU32[e >> 2] >= d) {
              f = 13;
              break c
            }
            HEAP32[b + 16 + (j << 2) >> 2] = HEAP32[e >> 2];
            j += 1
          }
          do {
            if(f != 16 && f == 13) {
              g = 1;
              break a
            }
          }while(0)
        }
      }while(0);
      j = 0;
      b:for(;;) {
        if(!(j < 4)) {
          f = 29;
          break b
        }
        l = 0;
        var m = _h264bsdNumSubMbPart(HEAP32[b + (j << 2) >> 2]);
        HEAP32[e >> 2] = m;
        c:for(;;) {
          m = HEAP32[e >> 2];
          HEAP32[e >> 2] = m - 1;
          if(m == 0) {
            f = 27;
            break c
          }
          h = _h264bsdDecodeExpGolombSigned(a, k);
          if(h != 0) {
            f = 22;
            break b
          }
          HEAP16[b + 32 + (j << 4) + (l << 2) >> 1] = HEAP32[k >> 2] & 65535;
          h = _h264bsdDecodeExpGolombSigned(a, k);
          if(h != 0) {
            f = 24;
            break b
          }
          HEAP16[b + 32 + (j << 4) + (l << 2) + 2 >> 1] = HEAP32[k >> 2] & 65535;
          l += 1
        }
        j += 1
      }
      f == 29 ? g = 0 : f == 22 ? g = h : f == 24 && (g = h)
    }else {
      f == 4 && (g = 1)
    }
  }while(0);
  STACKTOP = e;
  return g
}
_DecodeSubMbPred.X = 1;
function _DecodeMbPred(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 8;
  var f, g, h, j, l, k = e + 4;
  j = _h264bsdMbPartPredMode(c);
  f = j == 2 ? 1 : j == 0 ? 19 : j == 1 ? 32 : 36;
  a:do {
    if(f == 1) {
      f = d > 1 ? 2 : 10;
      do {
        if(f == 2) {
          j = _h264bsdNumMbPart(c);
          l = 0;
          c:for(;;) {
            var m = j;
            j = m - 1;
            if(m == 0) {
              f = 9;
              break c
            }
            h = _h264bsdDecodeExpGolombTruncated(a, e, d > 2);
            if(h != 0) {
              f = 6;
              break c
            }
            if(HEAPU32[e >> 2] >= d) {
              f = 6;
              break c
            }
            HEAP32[b + 132 + (l << 2) >> 2] = HEAP32[e >> 2];
            l += 1
          }
          do {
            if(f != 9 && f == 6) {
              g = 1;
              f = 37;
              break a
            }
          }while(0)
        }
      }while(0);
      j = _h264bsdNumMbPart(c);
      l = 0;
      b:for(;;) {
        m = j;
        j = m - 1;
        if(m == 0) {
          f = 18;
          break b
        }
        h = _h264bsdDecodeExpGolombSigned(a, k);
        if(h != 0) {
          f = 13;
          break b
        }
        HEAP16[b + 148 + (l << 2) >> 1] = HEAP32[k >> 2] & 65535;
        h = _h264bsdDecodeExpGolombSigned(a, k);
        if(h != 0) {
          f = 15;
          break b
        }
        HEAP16[b + 148 + (l << 2) + 2 >> 1] = HEAP32[k >> 2] & 65535;
        l += 1
      }
      do {
        if(f == 18) {
          f = 36;
          break a
        }else {
          if(f == 13) {
            g = h;
            f = 37;
            break a
          }else {
            if(f == 15) {
              g = h;
              f = 37;
              break a
            }
          }
        }
      }while(0)
    }else {
      if(f == 19) {
        j = HEAP32[k >> 2] = 0;
        b:for(;;) {
          if(!(HEAP32[k >> 2] < 2)) {
            f = 31;
            break b
          }
          h = _h264bsdShowBits32(a);
          HEAP32[e >> 2] = h;
          h = 0;
          l = 8;
          c:for(;;) {
            f = l;
            l = f - 1;
            if(f == 0) {
              f = 27;
              break c
            }
            HEAP32[b + (j << 2) >> 2] = (HEAP32[e >> 2] & -2147483648) != 0 ? 1 : 0;
            HEAP32[e >> 2] <<= 1;
            f = HEAP32[b + (j << 2) >> 2] != 0 ? 25 : 24;
            f == 24 && (HEAP32[b + 64 + (j << 2) >> 2] = HEAPU32[e >> 2] >>> 29, HEAP32[e >> 2] <<= 3, h += 1);
            j += 1
          }
          if(_h264bsdFlushBits(a, h * 3 + 8) == -1) {
            f = 28;
            break b
          }
          HEAP32[k >> 2] += 1
        }
        do {
          if(f == 31) {
            f = 32;
            break a
          }else {
            if(f == 28) {
              g = 1;
              f = 37;
              break a
            }
          }
        }while(0)
      }
    }
  }while(0);
  a:do {
    if(f == 32) {
      h = _h264bsdDecodeExpGolombUnsigned(a, e);
      f = h != 0 ? 34 : 33;
      b:do {
        if(f == 33) {
          if(HEAPU32[e >> 2] > 3) {
            break b
          }
          HEAP32[b + 128 >> 2] = HEAP32[e >> 2];
          f = 36;
          break a
        }
      }while(0);
      g = 1;
      f = 37;
      break a
    }
  }while(0);
  f == 36 && (g = 0);
  STACKTOP = e;
  return g
}
_DecodeMbPred.X = 1;
function _h264bsdNumSubMbPart(a) {
  var b, a = a == 0 ? 1 : a == 1 ? 2 : a == 2 ? 2 : 3;
  a == 3 ? b = 4 : a == 1 ? b = 1 : a == 2 && (b = 2);
  return b
}
function _h264bsdPredModeIntra16x16(a) {
  return a - 7 & 3
}
function _DecodeResidual(a, b, c, d, e) {
  var f, g, h, j, l, k, m, n;
  n = b + 56;
  f = _h264bsdMbPartPredMode(d) == 1 ? 1 : 4;
  a:do {
    if(f == 1) {
      l = _DetermineNc(c, 0, b);
      j = _h264bsdDecodeResidualBlockCavlc(a, n + 1536, l, 16);
      f = (j & 15) != 0 ? 2 : 3;
      do {
        if(f == 2) {
          g = j;
          f = 35;
          break a
        }else {
          if(f == 3) {
            HEAP16[b + 48 >> 1] = j >>> 4 & 255;
            m = 1;
            f = 5;
            break a
          }
        }
      }while(0)
    }else {
      if(f == 4) {
        m = 0;
        f = 5;
        break a
      }
    }
  }while(0);
  a:do {
    if(f == 5) {
      d = 4;
      k = 0;
      b:for(;;) {
        f = d;
        d = f - 1;
        if(f == 0) {
          f = 20;
          break b
        }
        f = e & 1;
        e >>>= 1;
        f = f != 0 ? 8 : 18;
        do {
          if(f == 8) {
            h = 4;
            d:for(;;) {
              f = h;
              h = f - 1;
              if(f == 0) {
                f = 17;
                break d
              }
              l = _DetermineNc(c, k, b);
              f = m != 0 ? 11 : 12;
              f == 11 ? (j = _h264bsdDecodeResidualBlockCavlc(a, n + (k << 6) + 4, l, 15), HEAP32[b + 1720 + (k << 2) >> 2] = j >>> 15) : f == 12 && (j = _h264bsdDecodeResidualBlockCavlc(a, n + (k << 6), l, 16), HEAP32[b + 1720 + (k << 2) >> 2] = j >>> 16);
              if((j & 15) != 0) {
                f = 14;
                break b
              }
              HEAP16[b + (k << 1) >> 1] = j >>> 4 & 255;
              k += 1
            }
          }else {
            f == 18 && (k += 4)
          }
        }while(0)
      }
      do {
        if(f == 20) {
          f = e & 3;
          f = f != 0 ? 21 : 26;
          do {
            if(f == 21) {
              j = _h264bsdDecodeResidualBlockCavlc(a, n + 1600, -1, 4);
              f = (j & 15) != 0 ? 22 : 23;
              do {
                if(f == 22) {
                  g = j;
                  break a
                }else {
                  if(f == 23) {
                    HEAP16[b + 50 >> 1] = j >>> 4 & 255;
                    j = _h264bsdDecodeResidualBlockCavlc(a, n + 1616, -1, 4);
                    f = (j & 15) != 0 ? 24 : 25;
                    do {
                      if(f == 24) {
                        g = j;
                        break a
                      }else {
                        f == 25 && (HEAP16[b + 52 >> 1] = j >>> 4 & 255)
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }while(0);
          f = e & 2;
          f = f != 0 ? 27 : 34;
          do {
            if(f == 27) {
              d = 8;
              d:for(;;) {
                g = d;
                d = g - 1;
                if(g == 0) {
                  f = 33;
                  break d
                }
                l = _DetermineNc(c, k, b);
                j = _h264bsdDecodeResidualBlockCavlc(a, n + (k << 6) + 4, l, 15);
                if((j & 15) != 0) {
                  f = 30;
                  break d
                }
                HEAP16[b + (k << 1) >> 1] = j >>> 4 & 255;
                HEAP32[b + 1720 + (k << 2) >> 2] = j >>> 15;
                k += 1
              }
              do {
                if(f != 33 && f == 30) {
                  g = j;
                  break a
                }
              }while(0)
            }
          }while(0);
          g = 0
        }else {
          f == 14 && (g = j)
        }
      }while(0)
    }
  }while(0);
  return g
}
_DecodeResidual.X = 1;
function _h264bsdDecodeMacroblock(a, b, c, d, e, f, g, h) {
  var j, l, k, m, n, q, p;
  m = HEAP32[b >> 2];
  HEAP32[a >> 2] = m;
  HEAP32[a + 196 >> 2] += 1;
  _h264bsdSetCurrImageMbPointers(c, f);
  j = m == 31 ? 1 : 13;
  a:do {
    if(j == 1) {
      n = h;
      q = a + 28;
      p = b + 328;
      HEAP32[a + 20 >> 2] = 0;
      j = HEAPU32[a + 196 >> 2] > 1 ? 2 : 6;
      do {
        if(j == 2) {
          l = 24;
          c:for(;;) {
            k = l;
            l = k - 1;
            if(k == 0) {
              j = 5;
              break c
            }
            k = q;
            q = k + 2;
            HEAP16[k >> 1] = 16
          }
          l = 0
        }else {
          if(j == 6) {
            l = 24;
            c:for(;;) {
              k = l;
              l = k - 1;
              if(k == 0) {
                j = 12;
                break c
              }
              k = q;
              q = k + 2;
              k = HEAP16[k >> 1] = 16;
              d:for(;;) {
                var o = k;
                k = o - 1;
                if(o == 0) {
                  j = 11;
                  break d
                }
                o = p;
                p = o + 4;
                var o = HEAP32[o >> 2] & 255, r = n;
                n = r + 1;
                HEAP8[r] = o
              }
            }
            _h264bsdWriteMacroblock(c, h);
            l = 0
          }
        }
      }while(0)
    }else {
      if(j == 13) {
        j = m != 0 ? 14 : 24;
        do {
          if(j == 14) {
            _H264SwDecMemcpy(a + 28, b + 272, 54);
            j = HEAP32[b + 8 >> 2] != 0 ? 15 : 21;
            j == 15 && (HEAP32[e >> 2] += HEAP32[b + 8 >> 2], j = HEAP32[e >> 2] < 0 ? 16 : 17, j == 16 ? HEAP32[e >> 2] += 52 : j == 17 && (j = HEAP32[e >> 2] >= 52 ? 18 : 19, j == 18 && (HEAP32[e >> 2] -= 52)));
            HEAP32[a + 20 >> 2] = HEAP32[e >> 2];
            k = _ProcessResidual(a, b + 328, b + 1992);
            j = k != 0 ? 22 : 23;
            do {
              if(j == 22) {
                l = k;
                break a
              }
            }while(0)
          }else {
            j == 24 && (_H264SwDecMemset(a + 28, 0, 54), HEAP32[a + 20 >> 2] = HEAP32[e >> 2])
          }
        }while(0);
        j = _h264bsdMbPartPredMode(m) != 2 ? 26 : 29;
        do {
          if(j == 26) {
            k = _h264bsdIntraPrediction(a, b, c, f, g, h);
            j = k != 0 ? 27 : 28;
            do {
              if(j == 27) {
                l = k;
                break a
              }
            }while(0)
          }else {
            if(j == 29) {
              k = _h264bsdInterPrediction(a, b, d, f, c, h);
              j = k != 0 ? 30 : 31;
              do {
                if(j == 30) {
                  l = k;
                  break a
                }
              }while(0)
            }
          }
        }while(0);
        l = 0
      }
    }
  }while(0);
  return l
}
_h264bsdDecodeMacroblock.X = 1;
function _h264bsdSubMbPartMode(a) {
  return a
}
function _h264bsdShowBits32(a) {
  var b, c, d, e, f, g, h;
  f = HEAP32[a + 4 >> 2];
  d = (HEAP32[a + 12 >> 2] << 3) - HEAP32[a + 16 >> 2];
  b = d >= 32 ? 1 : 4;
  do {
    if(b == 1) {
      e = HEAP32[a + 8 >> 2], c = HEAPU8[f] << 24 | HEAPU8[f + 1] << 16 | HEAPU8[f + 2] << 8 | HEAPU8[f + 3], b = e != 0 ? 2 : 3, b == 2 && (g = HEAPU8[f + 4], h = 8 - e, c <<= e, c |= g >>> h)
    }else {
      if(b == 4) {
        b = d > 0 ? 5 : 9;
        do {
          if(b == 5) {
            e = HEAP32[a + 8 >> 2] + 24;
            c = f;
            f = c + 1;
            c = HEAPU8[c] << e;
            d -= 8 - HEAP32[a + 8 >> 2];
            c:for(;;) {
              if(!(d > 0)) {
                b = 8;
                break c
              }
              e -= 8;
              g = f;
              f = g + 1;
              c |= HEAPU8[g] << e;
              d -= 8
            }
          }else {
            b == 9 && (c = 0)
          }
        }while(0)
      }
    }
  }while(0);
  return c
}
_h264bsdShowBits32.X = 1;
function _h264bsdFlushBits(a, b) {
  var c, d;
  HEAP32[a + 16 >> 2] += b;
  HEAP32[a + 8 >> 2] = HEAP32[a + 16 >> 2] & 7;
  c = HEAPU32[a + 16 >> 2] <= HEAP32[a + 12 >> 2] << 3 ? 1 : 2;
  c == 1 ? (HEAP32[a + 4 >> 2] = HEAP32[a >> 2] + (HEAPU32[a + 16 >> 2] >>> 3), d = 0) : c == 2 && (d = -1);
  return d
}
function _h264bsdIsByteAligned(a) {
  var b, a = HEAP32[a + 8 >> 2] != 0 ? 2 : 1;
  a == 2 ? b = 0 : a == 1 && (b = 1);
  return b
}
function _ProcessResidual(a, b, c) {
  var d, e, f, g, h, j, l;
  g = b + 1536;
  h = b;
  j = a + 28;
  d = _h264bsdMbPartPredMode(HEAP32[a >> 2]) == 1 ? 1 : 14;
  a:do {
    if(d == 1) {
      d = HEAP16[j + 48 >> 1] != 0 ? 2 : 3;
      d == 2 && _h264bsdProcessLumaDc(g, HEAP32[a + 20 >> 2]);
      l = _dcCoeffIndex;
      f = 16;
      b:for(;;) {
        d = f;
        f = d - 1;
        if(d == 0) {
          d = 13;
          break b
        }
        d = l;
        l = d + 4;
        HEAP32[h >> 2] = HEAP32[g + (HEAP32[d >> 2] << 2) >> 2];
        d = HEAP32[h >> 2] != 0 ? 7 : 6;
        c:do {
          if(d == 6) {
            if(HEAP16[j >> 1] != 0) {
              d = 7;
              break c
            }
            HEAP32[h >> 2] = 16777215;
            d = 11;
            break c
          }
        }while(0);
        do {
          if(d == 7 && _h264bsdProcessBlock(h, HEAP32[a + 20 >> 2], 1, HEAP32[c >> 2]) != 0) {
            d = 8;
            break b
          }
        }while(0);
        h += 64;
        j += 2;
        c += 4
      }
      do {
        if(d == 13) {
          d = 24;
          break a
        }else {
          if(d == 8) {
            e = 1;
            d = 38;
            break a
          }
        }
      }while(0)
    }else {
      if(d == 14) {
        f = 16;
        b:for(;;) {
          d = f;
          f = d - 1;
          if(d == 0) {
            d = 23;
            break b
          }
          d = HEAP16[j >> 1] != 0 ? 17 : 20;
          do {
            if(d == 17) {
              if(_h264bsdProcessBlock(h, HEAP32[a + 20 >> 2], 0, HEAP32[c >> 2]) != 0) {
                d = 18;
                break b
              }
            }else {
              d == 20 && (HEAP32[h >> 2] = 16777215)
            }
          }while(0);
          h += 64;
          j += 2;
          c += 4
        }
        do {
          if(d == 23) {
            d = 24;
            break a
          }else {
            if(d == 18) {
              e = 1;
              d = 38;
              break a
            }
          }
        }while(0)
      }
    }
  }while(0);
  do {
    if(d == 24) {
      f = _clip(0, 51, HEAP32[a + 20 >> 2] + HEAP32[a + 24 >> 2]);
      g = HEAP32[_h264bsdQpC + (f << 2) >> 2];
      d = HEAP16[a + 78 >> 1] != 0 ? 26 : 25;
      b:do {
        if(d == 25) {
          d = HEAP16[a + 80 >> 1] != 0 ? 26 : 27;
          break b
        }
      }while(0);
      d == 26 && _h264bsdProcessChromaDc(b + 1600, g);
      l = b + 1600;
      f = 8;
      b:for(;;) {
        d = f;
        f = d - 1;
        if(d == 0) {
          d = 37;
          break b
        }
        d = l;
        l = d + 4;
        HEAP32[h >> 2] = HEAP32[d >> 2];
        d = HEAP32[h >> 2] != 0 ? 31 : 30;
        c:do {
          if(d == 30) {
            if(HEAP16[j >> 1] != 0) {
              d = 31;
              break c
            }
            HEAP32[h >> 2] = 16777215;
            d = 35;
            break c
          }
        }while(0);
        do {
          if(d == 31 && _h264bsdProcessBlock(h, g, 1, HEAP32[c >> 2]) != 0) {
            d = 32;
            break b
          }
        }while(0);
        h += 64;
        j += 2;
        c += 4
      }
      d == 37 ? e = 0 : d == 32 && (e = 1)
    }
  }while(0);
  return e
}
_ProcessResidual.X = 1;
function _DetermineNc(a, b, c) {
  var d, e, f, g, h;
  e = _h264bsdNeighbour4x4BlockA(b);
  f = _h264bsdNeighbour4x4BlockB(b);
  g = HEAP8[e + 4];
  h = HEAP8[f + 4];
  b = HEAP32[e >> 2] == 4 ? 1 : 3;
  a:do {
    if(b == 1) {
      if(HEAP32[f >> 2] != 4) {
        b = 3;
        break a
      }
      d = HEAP16[c + (g << 1) >> 1] + HEAP16[c + (h << 1) >> 1] + 1 >> 1;
      b = 21;
      break a
    }
  }while(0);
  b == 3 && (b = HEAP32[e >> 2] == 4 ? 4 : 7, b == 4 ? (d = HEAP16[c + (g << 1) >> 1], b = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 204 >> 2]) != 0 ? 5 : 6, b == 5 && (d = d + HEAP16[HEAP32[a + 204 >> 2] + 28 + (h << 1) >> 1] + 1 >> 1)) : b == 7 && (b = HEAP32[f >> 2] == 4 ? 8 : 11, b == 8 ? (d = HEAP16[c + (h << 1) >> 1], b = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 200 >> 2]) != 0 ? 9 : 10, b == 9 && (d = d + HEAP16[HEAP32[a + 200 >> 2] + 28 + (g << 1) >> 1] + 1 >> 1)) : b == 11 && (d = c = 
  0, b = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 200 >> 2]) != 0 ? 12 : 13, b == 12 && (d = HEAP16[HEAP32[a + 200 >> 2] + 28 + (g << 1) >> 1], c = 1), b = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 204 >> 2]) != 0 ? 14 : 18, b == 14 && (b = c != 0 ? 15 : 16, b == 15 ? d = d + HEAP16[HEAP32[a + 204 >> 2] + 28 + (h << 1) >> 1] + 1 >> 1 : b == 16 && (d = HEAP16[HEAP32[a + 204 >> 2] + 28 + (h << 1) >> 1])))));
  return d
}
_DetermineNc.X = 1;
function _h264bsdGetBits(a, b) {
  var c, d, e;
  e = _h264bsdShowBits32(a) >>> 32 - b;
  c = _h264bsdFlushBits(a, b) == 0 ? 1 : 2;
  c == 1 ? d = e : c == 2 && (d = -1);
  return d
}
function _h264bsdDecodeExpGolombUnsigned(a, b) {
  var c, d, e, f;
  e = _h264bsdShowBits32(a);
  c = e >>> 0 >= 2147483648 ? 1 : 2;
  a:do {
    if(c == 1) {
      _h264bsdFlushBits(a, 1), d = HEAP32[b >> 2] = 0
    }else {
      if(c == 2) {
        c = e >= 1073741824 ? 3 : 6;
        do {
          if(c == 3) {
            c = _h264bsdFlushBits(a, 3) == -1 ? 4 : 5, c == 4 ? d = 1 : c == 5 && (HEAP32[b >> 2] = (e >>> 29 & 1) + 1, d = 0)
          }else {
            if(c == 6) {
              c = e >= 536870912 ? 7 : 10;
              do {
                if(c == 7) {
                  c = _h264bsdFlushBits(a, 5) == -1 ? 8 : 9, c == 8 ? d = 1 : c == 9 && (HEAP32[b >> 2] = (e >>> 27 & 3) + 3, d = 0)
                }else {
                  if(c == 10) {
                    c = e >= 268435456 ? 11 : 14;
                    do {
                      if(c == 11) {
                        c = _h264bsdFlushBits(a, 7) == -1 ? 12 : 13, c == 12 ? d = 1 : c == 13 && (HEAP32[b >> 2] = (e >>> 25 & 7) + 7, d = 0)
                      }else {
                        if(c == 14) {
                          f = _h264bsdCountLeadingZeros(e, 28) + 4;
                          c = f == 32 ? 15 : 25;
                          do {
                            if(c == 15) {
                              HEAP32[b >> 2] = 0;
                              _h264bsdFlushBits(a, 32);
                              e = _h264bsdGetBits(a, 1);
                              c = e == 1 ? 16 : 24;
                              do {
                                if(c == 16) {
                                  e = _h264bsdShowBits32(a);
                                  c = _h264bsdFlushBits(a, 32) == -1 ? 17 : 18;
                                  do {
                                    if(c == 17) {
                                      d = 1;
                                      break a
                                    }else {
                                      if(c == 18) {
                                        c = e == 0 ? 19 : 20;
                                        do {
                                          if(c == 19) {
                                            HEAP32[b >> 2] = -1;
                                            d = 0;
                                            break a
                                          }else {
                                            if(c == 20) {
                                              c = e == 1 ? 21 : 22;
                                              do {
                                                if(c == 21) {
                                                  HEAP32[b >> 2] = -1;
                                                  d = 1;
                                                  break a
                                                }
                                              }while(0)
                                            }
                                          }
                                        }while(0)
                                      }
                                    }
                                  }while(0)
                                }
                              }while(0);
                              d = 1
                            }else {
                              c == 25 && (_h264bsdFlushBits(a, f + 1), e = _h264bsdGetBits(a, f), c = e == -1 ? 27 : 28, c == 27 ? d = 1 : c == 28 && (HEAP32[b >> 2] = (1 << f) - 1 + e, d = 0))
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  return d
}
_h264bsdDecodeExpGolombUnsigned.X = 1;
function _h264bsdDecodeExpGolombSigned(a, b) {
  var c = STACKTOP;
  STACKTOP += 4;
  var d, e, f;
  HEAP32[c >> 2] = 0;
  f = _h264bsdDecodeExpGolombUnsigned(a, c);
  d = HEAP32[c >> 2] == -1 ? 1 : 4;
  if(d == 1) {
    d = f == 0 ? 2 : 3, d == 2 ? e = 1 : d == 3 && (HEAP32[b >> 2] = -2147483648, e = 0)
  }else {
    if(d == 4) {
      if(d = f == 0 ? 5 : 9, d == 5) {
        d = (HEAP32[c >> 2] & 1) != 0 ? 6 : 7;
        if(d == 6) {
          var g = HEAP32[c >> 2] + 1 >>> 1
        }else {
          d == 7 && (g = -(HEAP32[c >> 2] + 1 >>> 1))
        }
        HEAP32[b >> 2] = g;
        e = 0
      }else {
        d == 9 && (e = 1)
      }
    }
  }
  STACKTOP = c;
  return e
}
function _h264bsdDecodeExpGolombMapped(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 4;
  var e, a = _h264bsdDecodeExpGolombUnsigned(a, d) != 0 ? 1 : 2;
  a == 1 ? e = 1 : a == 2 && (a = HEAPU32[d >> 2] > 47 ? 3 : 4, a == 3 ? e = 1 : a == 4 && (a = c != 0 ? 5 : 6, a == 5 ? HEAP32[b >> 2] = HEAPU8[_codedBlockPatternIntra4x4 + HEAP32[d >> 2]] : a == 6 && (HEAP32[b >> 2] = HEAPU8[_codedBlockPatternInter + HEAP32[d >> 2]]), e = 0));
  STACKTOP = d;
  return e
}
function _h264bsdDecodeExpGolombTruncated(a, b, c) {
  var d, c = c != 0 ? 1 : 2;
  c == 1 ? d = _h264bsdDecodeExpGolombUnsigned(a, b) : c == 2 && (a = _h264bsdGetBits(a, 1), HEAP32[b >> 2] = a, c = HEAP32[b >> 2] == -1 ? 3 : 4, c == 3 ? d = 1 : c == 4 && (HEAP32[b >> 2] ^= 1, d = 0));
  return d
}
function _DecodeCoeffToken(a, b) {
  var c, d;
  c = b >>> 0 < 2 ? 1 : 14;
  c == 1 ? (c = a >= 32768 ? 2 : 3, c == 2 ? d = 1 : c == 3 && (c = a >= 3072 ? 4 : 5, c == 4 ? d = HEAPU16[_coeffToken0_0 + (a >>> 10 << 1) >> 1] : c == 5 && (c = a >= 256 ? 6 : 7, c == 6 ? d = HEAPU16[_coeffToken0_1 + (a >>> 6 << 1) >> 1] : c == 7 && (c = a >= 32 ? 8 : 9, c == 8 ? d = HEAPU16[_coeffToken0_2 + ((a >>> 2) - 8 << 1) >> 1] : c == 9 && (d = HEAPU16[_coeffToken0_3 + (a << 1) >> 1]))))) : c == 14 && (c = b >>> 0 < 4 ? 15 : 25, c == 15 ? (c = a >= 32768 ? 16 : 17, c == 16 ? d = (a & 16384) != 
  0 ? 2 : 2082 : c == 17 && (c = a >= 4096 ? 18 : 19, c == 18 ? d = HEAPU16[_coeffToken2_0 + (a >>> 10 << 1) >> 1] : c == 19 && (c = a >= 512 ? 20 : 21, c == 20 ? d = HEAPU16[_coeffToken2_1 + (a >>> 7 << 1) >> 1] : c == 21 && (d = HEAPU16[_coeffToken2_2 + (a >>> 2 << 1) >> 1])))) : c == 25 && (c = b >>> 0 < 8 ? 26 : 29, c == 26 ? (d = HEAPU16[_coeffToken4_0 + (a >>> 10 << 1) >> 1], (d != 0 ? 28 : 27) == 27 && (d = HEAPU16[_coeffToken4_1 + (a >>> 6 << 1) >> 1])) : c == 29 && (c = b >>> 0 <= 16 ? 30 : 
  31, c == 30 ? d = HEAPU16[_coeffToken8 + (a >>> 10 << 1) >> 1] : c == 31 && (d = HEAPU16[_coeffTokenMinus1_0 + (a >>> 13 << 1) >> 1], (d != 0 ? 33 : 32) == 32 && (d = HEAPU16[_coeffTokenMinus1_1 + (a >>> 8 << 1) >> 1])))));
  return d
}
_DecodeCoeffToken.X = 1;
function _h264bsdDecodeResidualBlockCavlc(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 128;
  var f, g, h, j, l, k, m, n, q, p, o = e + 64, r, s;
  s = 32;
  r = _h264bsdShowBits32(a);
  f = s < 16 ? 1 : 4;
  a:do {
    if(f == 1) {
      f = _h264bsdFlushBits(a, 32 - s) == -1 ? 2 : 3;
      do {
        if(f == 2) {
          g = 1;
          f = 95;
          break a
        }else {
          if(f == 3) {
            r = _h264bsdShowBits32(a);
            s = 32;
            f = 4;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  a:do {
    if(f == 4) {
      n = r >>> 16;
      j = _DecodeCoeffToken(n, c);
      f = j != 0 ? 6 : 5;
      do {
        if(f == 6) {
          r <<= j & 31;
          s -= j & 31;
          l = j >>> 11 & 31;
          f = l > d ? 7 : 8;
          do {
            if(f == 7) {
              g = 1
            }else {
              if(f == 8) {
                k = j >>> 5 & 63;
                f = l != 0 ? 9 : 91;
                do {
                  if(f == 9) {
                    h = 0;
                    f = k != 0 ? 10 : 22;
                    do {
                      if(f == 10) {
                        f = s < k ? 11 : 14;
                        do {
                          if(f == 11) {
                            f = _h264bsdFlushBits(a, 32 - s) == -1 ? 12 : 13;
                            do {
                              if(f == 12) {
                                g = 1;
                                break a
                              }else {
                                f == 13 && (r = _h264bsdShowBits32(a), s = 32)
                              }
                            }while(0)
                          }
                        }while(0);
                        n = r >>> 32 - k;
                        r <<= k;
                        s -= k;
                        j = 1 << k - 1;
                        f:for(;;) {
                          if(j == 0) {
                            f = 21;
                            break f
                          }
                          f = (n & j) != 0 ? 17 : 18;
                          if(f == 17) {
                            var t = -1
                          }else {
                            f == 18 && (t = 1)
                          }
                          HEAP32[e + (h << 2) >> 2] = t;
                          j >>>= 1;
                          h += 1
                        }
                      }
                    }while(0);
                    f = l > 10 ? 23 : 25;
                    e:do {
                      if(f == 23) {
                        if(!(k < 3)) {
                          f = 25;
                          break e
                        }
                        m = 1;
                        f = 26;
                        break e
                      }
                    }while(0);
                    f == 25 && (m = 0);
                    e:for(;;) {
                      if(!(h < l)) {
                        f = 65;
                        break e
                      }
                      f = s < 16 ? 29 : 32;
                      do {
                        if(f == 29) {
                          if(_h264bsdFlushBits(a, 32 - s) == -1) {
                            f = 30;
                            break e
                          }
                          r = _h264bsdShowBits32(a);
                          s = 32
                        }
                      }while(0);
                      n = r >>> 16;
                      n = _DecodeLevelPrefix(n);
                      if(n == -2) {
                        f = 33;
                        break e
                      }
                      r <<= n + 1;
                      s -= n + 1;
                      f = n < 14 ? 35 : 36;
                      if(f == 35) {
                        j = m
                      }else {
                        if(f == 36) {
                          if(f = n == 14 ? 37 : 41, f == 37) {
                            f = m != 0 ? 38 : 39;
                            if(f == 38) {
                              var u = m
                            }else {
                              f == 39 && (u = 4)
                            }
                            j = u
                          }else {
                            f == 41 && (f = m != 0 ? 43 : 42, f == 42 && (m = 1), j = 12)
                          }
                        }
                      }
                      f = m != 0 ? 46 : 47;
                      f == 46 && (n <<= m);
                      f = j != 0 ? 48 : 53;
                      do {
                        if(f == 48) {
                          f = s < j ? 49 : 52;
                          do {
                            if(f == 49) {
                              if(_h264bsdFlushBits(a, 32 - s) == -1) {
                                f = 50;
                                break e
                              }
                              r = _h264bsdShowBits32(a);
                              s = 32
                            }
                          }while(0);
                          q = r >>> 32 - j;
                          r <<= j;
                          s -= j;
                          n += q
                        }
                      }while(0);
                      j = n;
                      f = h == k ? 54 : 56;
                      f:do {
                        if(f == 54) {
                          if(!(k < 3)) {
                            break f
                          }
                          j += 2
                        }
                      }while(0);
                      HEAP32[e + (h << 2) >> 2] = j + 2 >>> 1;
                      f = m == 0 ? 57 : 58;
                      f == 57 && (m = 1);
                      f = HEAP32[e + (h << 2) >> 2] > 3 << m - 1 ? 59 : 61;
                      f:do {
                        if(f == 59) {
                          if(!(m < 6)) {
                            break f
                          }
                          m += 1
                        }
                      }while(0);
                      f = (j & 1) != 0 ? 62 : 63;
                      f == 62 && (HEAP32[e + (h << 2) >> 2] = -HEAP32[e + (h << 2) >> 2]);
                      h += 1
                    }
                    do {
                      if(f == 65) {
                        f = l < d ? 66 : 73;
                        do {
                          if(f == 66) {
                            f = s < 9 ? 67 : 70;
                            do {
                              if(f == 67) {
                                f = _h264bsdFlushBits(a, 32 - s) == -1 ? 68 : 69;
                                do {
                                  if(f == 68) {
                                    g = 1;
                                    break a
                                  }else {
                                    f == 69 && (r = _h264bsdShowBits32(a), s = 32)
                                  }
                                }while(0)
                              }
                            }while(0);
                            n = r >>> 23;
                            p = _DecodeTotalZeros(n, l, d == 4);
                            f = p != 0 ? 72 : 71;
                            do {
                              if(f == 72) {
                                r <<= p & 15, s -= p & 15, p = p >>> 4 & 15
                              }else {
                                if(f == 71) {
                                  g = 1;
                                  break a
                                }
                              }
                            }while(0)
                          }else {
                            f == 73 && (p = 0)
                          }
                        }while(0);
                        h = 0;
                        f:for(;;) {
                          if(!(h < l - 1)) {
                            f = 87;
                            break f
                          }
                          f = p > 0 ? 77 : 84;
                          do {
                            if(f == 77) {
                              f = s < 11 ? 78 : 81;
                              do {
                                if(f == 78) {
                                  if(_h264bsdFlushBits(a, 32 - s) == -1) {
                                    f = 79;
                                    break f
                                  }
                                  r = _h264bsdShowBits32(a);
                                  s = 32
                                }
                              }while(0);
                              n = r >>> 21;
                              j = _DecodeRunBefore(n, p);
                              if(j == 0) {
                                f = 82;
                                break f
                              }
                              r <<= j & 15;
                              s -= j & 15;
                              HEAP32[o + (h << 2) >> 2] = j >>> 4 & 15;
                              n = HEAP32[o + (h << 2) >> 2];
                              HEAP32[o + (h << 2) >> 2] = n + 1;
                              p -= n
                            }else {
                              f == 84 && (HEAP32[o + (h << 2) >> 2] = 1)
                            }
                          }while(0);
                          h += 1
                        }
                        do {
                          if(f == 87) {
                            j = p;
                            HEAP32[b + (j << 2) >> 2] = HEAP32[e + (l - 1 << 2) >> 2];
                            q = 1 << j;
                            h = l - 1;
                            g:for(;;) {
                              n = h;
                              h = n - 1;
                              if(n == 0) {
                                f = 90;
                                break g
                              }
                              j += HEAP32[o + (h << 2) >> 2];
                              q |= 1 << j;
                              HEAP32[b + (j << 2) >> 2] = HEAP32[e + (h << 2) >> 2]
                            }
                          }else {
                            if(f == 79) {
                              g = 1;
                              break a
                            }else {
                              if(f == 82) {
                                g = 1;
                                break a
                              }
                            }
                          }
                        }while(0)
                      }else {
                        if(f == 30) {
                          g = 1;
                          break a
                        }else {
                          if(f == 33) {
                            g = 1;
                            break a
                          }else {
                            if(f == 50) {
                              g = 1;
                              break a
                            }
                          }
                        }
                      }
                    }while(0)
                  }else {
                    f == 91 && (q = 0)
                  }
                }while(0);
                f = _h264bsdFlushBits(a, 32 - s) != 0 ? 93 : 94;
                f == 93 ? g = 1 : f == 94 && (g = l << 4 | q << 16)
              }
            }
          }while(0)
        }else {
          f == 5 && (g = 1)
        }
      }while(0)
    }
  }while(0);
  STACKTOP = e;
  return g
}
_h264bsdDecodeResidualBlockCavlc.X = 1;
function _DecodeLevelPrefix(a) {
  var b, c, d;
  b = a >= 32768 ? 1 : 2;
  a:do {
    if(b == 1) {
      d = 0;
      b = 48;
      break a
    }else {
      if(b == 2) {
        b = a >= 16384 ? 3 : 4;
        do {
          if(b == 3) {
            d = 1
          }else {
            if(b == 4) {
              b = a >= 8192 ? 5 : 6;
              do {
                if(b == 5) {
                  d = 2
                }else {
                  if(b == 6) {
                    b = a >= 4096 ? 7 : 8;
                    do {
                      if(b == 7) {
                        d = 3
                      }else {
                        if(b == 8) {
                          b = a >= 2048 ? 9 : 10;
                          do {
                            if(b == 9) {
                              d = 4
                            }else {
                              if(b == 10) {
                                b = a >= 1024 ? 11 : 12;
                                do {
                                  if(b == 11) {
                                    d = 5
                                  }else {
                                    if(b == 12) {
                                      b = a >= 512 ? 13 : 14;
                                      do {
                                        if(b == 13) {
                                          d = 6
                                        }else {
                                          if(b == 14) {
                                            b = a >= 256 ? 15 : 16;
                                            do {
                                              if(b == 15) {
                                                d = 7
                                              }else {
                                                if(b == 16) {
                                                  b = a >= 128 ? 17 : 18;
                                                  do {
                                                    if(b == 17) {
                                                      d = 8
                                                    }else {
                                                      if(b == 18) {
                                                        b = a >= 64 ? 19 : 20;
                                                        do {
                                                          if(b == 19) {
                                                            d = 9
                                                          }else {
                                                            if(b == 20) {
                                                              b = a >= 32 ? 21 : 22;
                                                              do {
                                                                if(b == 21) {
                                                                  d = 10
                                                                }else {
                                                                  if(b == 22) {
                                                                    b = a >= 16 ? 23 : 24;
                                                                    do {
                                                                      if(b == 23) {
                                                                        d = 11
                                                                      }else {
                                                                        if(b == 24) {
                                                                          b = a >= 8 ? 25 : 26;
                                                                          do {
                                                                            if(b == 25) {
                                                                              d = 12
                                                                            }else {
                                                                              if(b == 26) {
                                                                                b = a >= 4 ? 27 : 28;
                                                                                do {
                                                                                  if(b == 27) {
                                                                                    d = 13
                                                                                  }else {
                                                                                    if(b == 28) {
                                                                                      b = a >= 2 ? 29 : 30;
                                                                                      do {
                                                                                        if(b == 29) {
                                                                                          d = 14
                                                                                        }else {
                                                                                          if(b == 30) {
                                                                                            b = a >= 1 ? 31 : 32;
                                                                                            do {
                                                                                              if(b == 31) {
                                                                                                d = 15
                                                                                              }else {
                                                                                                if(b == 32) {
                                                                                                  c = -2;
                                                                                                  b = 49;
                                                                                                  break a
                                                                                                }
                                                                                              }
                                                                                            }while(0)
                                                                                          }
                                                                                        }
                                                                                      }while(0)
                                                                                    }
                                                                                  }
                                                                                }while(0)
                                                                              }
                                                                            }
                                                                          }while(0)
                                                                        }
                                                                      }
                                                                    }while(0)
                                                                  }
                                                                }
                                                              }while(0)
                                                            }
                                                          }
                                                        }while(0)
                                                      }
                                                    }
                                                  }while(0)
                                                }
                                              }
                                            }while(0)
                                          }
                                        }
                                      }while(0)
                                    }
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0);
        b = 48;
        break a
      }
    }
  }while(0);
  b == 48 && (c = d);
  return c
}
_DecodeLevelPrefix.X = 1;
function _DecodeTotalZeros(a, b, c) {
  var d;
  d = 0;
  c = c != 0 ? 20 : 1;
  c == 20 ? (a >>>= 6, c = a > 3 ? 21 : 22, c == 21 ? d = 1 : c == 22 && (c = b == 3 ? 23 : 24, c == 23 ? d = 17 : c == 24 && (c = a > 1 ? 25 : 26, c == 25 ? d = 18 : c == 26 && (c = b == 2 ? 27 : 28, c == 27 ? d = 34 : c == 28 && (c = a != 0 ? 29 : 30, c == 29 ? d = 35 : c == 30 && (d = 51)))))) : c == 1 && (c = b == 1 ? 2 : b == 2 ? 5 : b == 3 ? 6 : b == 4 ? 7 : b == 5 ? 8 : b == 6 ? 9 : b == 7 ? 10 : b == 8 ? 11 : b == 9 ? 12 : b == 10 ? 13 : b == 11 ? 14 : b == 12 ? 15 : b == 13 ? 16 : b == 14 ? 
  17 : 18, c == 18 ? d = a >>> 8 != 0 ? 17 : 1 : c == 2 ? (d = HEAPU8[_totalZeros_1_0 + (a >>> 4)], (d != 0 ? 4 : 3) == 3 && (d = HEAPU8[_totalZeros_1_1 + a])) : c == 5 ? d = HEAPU8[_totalZeros_2 + (a >>> 3)] : c == 6 ? d = HEAPU8[_totalZeros_3 + (a >>> 3)] : c == 7 ? d = HEAPU8[_totalZeros_4 + (a >>> 4)] : c == 8 ? d = HEAPU8[_totalZeros_5 + (a >>> 4)] : c == 9 ? d = HEAPU8[_totalZeros_6 + (a >>> 3)] : c == 10 ? d = HEAPU8[_totalZeros_7 + (a >>> 3)] : c == 11 ? d = HEAPU8[_totalZeros_8 + (a >>> 
  3)] : c == 12 ? d = HEAPU8[_totalZeros_9 + (a >>> 3)] : c == 13 ? d = HEAPU8[_totalZeros_10 + (a >>> 4)] : c == 14 ? d = HEAPU8[_totalZeros_11 + (a >>> 5)] : c == 15 ? d = HEAPU8[_totalZeros_12 + (a >>> 5)] : c == 16 ? d = HEAPU8[_totalZeros_13 + (a >>> 6)] : c == 17 && (d = HEAPU8[_totalZeros_14 + (a >>> 7)]));
  return d
}
_DecodeTotalZeros.X = 1;
function _DecodeRunBefore(a, b) {
  var c, d;
  d = 0;
  c = b == 1 ? 1 : b == 2 ? 2 : b == 3 ? 3 : b == 4 ? 4 : b == 5 ? 5 : b == 6 ? 6 : 7;
  c == 7 ? (c = a >= 256 ? 8 : 9, c == 8 ? d = (7 - (a >>> 8) << 4) + 3 : c == 9 && (c = a >= 128 ? 10 : 11, c == 10 ? d = 116 : c == 11 && (c = a >= 64 ? 12 : 13, c == 12 ? d = 133 : c == 13 && (c = a >= 32 ? 14 : 15, c == 14 ? d = 150 : c == 15 && (c = a >= 16 ? 16 : 17, c == 16 ? d = 167 : c == 17 && (c = a >= 8 ? 18 : 19, c == 18 ? d = 184 : c == 19 && (c = a >= 4 ? 20 : 21, c == 20 ? d = 201 : c == 21 && (c = a >= 2 ? 22 : 23, c == 22 ? d = 218 : c == 23 && (a != 0 ? 24 : 25) == 24 && (d = 235)))))))), 
  ((d >>> 4 & 15) > b ? 34 : 35) == 34 && (d = 0)) : c == 1 ? d = HEAPU8[_runBefore_1 + (a >>> 10)] : c == 2 ? d = HEAPU8[_runBefore_2 + (a >>> 9)] : c == 3 ? d = HEAPU8[_runBefore_3 + (a >>> 9)] : c == 4 ? d = HEAPU8[_runBefore_4 + (a >>> 8)] : c == 5 ? d = HEAPU8[_runBefore_5 + (a >>> 8)] : c == 6 && (d = HEAPU8[_runBefore_6 + (a >>> 8)]);
  return d
}
_DecodeRunBefore.X = 1;
function _h264bsdInitMbNeighbours(a, b, c) {
  var d, e, f, g;
  e = f = g = 0;
  a:for(;;) {
    if(!(e < c)) {
      break a
    }
    d = g != 0 ? 3 : 4;
    d == 3 ? HEAP32[a + e * 216 + 200 >> 2] = a + e * 216 - 216 : d == 4 && (HEAP32[a + e * 216 + 200 >> 2] = 0);
    d = f != 0 ? 6 : 7;
    d == 6 ? HEAP32[a + e * 216 + 204 >> 2] = a + e * 216 + -b * 216 : d == 7 && (HEAP32[a + e * 216 + 204 >> 2] = 0);
    d = f != 0 ? 9 : 11;
    b:do {
      if(d == 9) {
        if(!(g < b - 1)) {
          d = 11;
          break b
        }
        HEAP32[a + e * 216 + 208 >> 2] = a + e * 216 + -(b - 1) * 216;
        d = 12;
        break b
      }
    }while(0);
    d == 11 && (HEAP32[a + e * 216 + 208 >> 2] = 0);
    d = f != 0 ? 13 : 15;
    b:do {
      if(d == 13) {
        if(g == 0) {
          d = 15;
          break b
        }
        HEAP32[a + e * 216 + 212 >> 2] = a + e * 216 + -(b + 1) * 216;
        d = 16;
        break b
      }
    }while(0);
    d == 15 && (HEAP32[a + e * 216 + 212 >> 2] = 0);
    g += 1;
    d = g == b ? 17 : 18;
    d == 17 && (g = 0, f += 1);
    e += 1
  }
}
_h264bsdInitMbNeighbours.X = 1;
function _h264bsdDecodeNalUnit(a, b) {
  var c, d, e;
  e = _h264bsdGetBits(a, 1);
  c = e == -1 ? 1 : 2;
  a:do {
    if(c == 1) {
      d = 1
    }else {
      if(c == 2) {
        e = _h264bsdGetBits(a, 2);
        HEAP32[b + 4 >> 2] = e;
        e = _h264bsdGetBits(a, 5);
        HEAP32[b >> 2] = e;
        c = e == 2 ? 5 : 3;
        b:do {
          if(c == 3) {
            if(e == 3) {
              c = 5;
              break b
            }
            if(e == 4) {
              c = 5;
              break b
            }
            c = e == 7 ? 9 : 7;
            c:do {
              if(c == 7) {
                if(e == 8) {
                  c = 9;
                  break c
                }
                c = e == 5 ? 9 : 11;
                break c
              }
            }while(0);
            c:do {
              if(c == 9) {
                if(HEAP32[b + 4 >> 2] != 0) {
                  break c
                }
                d = 1;
                break a
              }
            }while(0);
            c = e == 6 ? 16 : 12;
            c:do {
              if(c == 12) {
                if(e == 9) {
                  c = 16;
                  break c
                }
                if(e == 10) {
                  c = 16;
                  break c
                }
                if(e == 11) {
                  c = 16;
                  break c
                }
                c = e == 12 ? 16 : 18;
                break c
              }
            }while(0);
            c:do {
              if(c == 16) {
                if(HEAP32[b + 4 >> 2] == 0) {
                  break c
                }
                d = 1;
                break a
              }
            }while(0);
            d = 0;
            break a
          }
        }while(0);
        d = 1
      }
    }
  }while(0);
  return d
}
_h264bsdDecodeNalUnit.X = 1;
function _h264bsdGetNeighbourMb(a, b) {
  var c, d;
  c = b == 0 ? 1 : 2;
  c == 1 ? d = HEAP32[a + 200 >> 2] : c == 2 && (c = b == 1 ? 3 : 4, c == 3 ? d = HEAP32[a + 204 >> 2] : c == 4 && (c = b == 2 ? 5 : 6, c == 5 ? d = HEAP32[a + 208 >> 2] : c == 6 && (c = b == 3 ? 7 : 8, c == 7 ? d = HEAP32[a + 212 >> 2] : c == 8 && (c = b == 4 ? 9 : 10, c == 9 ? d = a : c == 10 && (d = 0)))));
  return d
}
function _h264bsdNeighbour4x4BlockA(a) {
  return _N_A_4x4B + (a << 3)
}
function _h264bsdNeighbour4x4BlockB(a) {
  return _N_B_4x4B + (a << 3)
}
function _h264bsdNeighbour4x4BlockC(a) {
  return _N_C_4x4B + (a << 3)
}
function _h264bsdNeighbour4x4BlockD(a) {
  return _N_D_4x4B + (a << 3)
}
function _h264bsdIsNeighbourAvailable(a, b) {
  var c, d;
  c = b == 0 ? 2 : 1;
  a:do {
    if(c == 1) {
      if(HEAP32[a + 4 >> 2] != HEAP32[b + 4 >> 2]) {
        c = 2;
        break a
      }
      d = 1;
      c = 4;
      break a
    }
  }while(0);
  c == 2 && (d = 0);
  return d
}
function _h264bsdInitStorage(a) {
  _H264SwDecMemset(a, 0, 3388);
  HEAP32[a + 8 >> 2] = 32;
  HEAP32[a + 4 >> 2] = 256;
  HEAP32[a + 1332 >> 2] = 1
}
function _h264bsdStoreSeqParamSet(a, b) {
  var c, d, e;
  e = HEAP32[b + 8 >> 2];
  c = HEAP32[a + 20 + (e << 2) >> 2] == 0 ? 1 : 4;
  a:do {
    if(c == 1) {
      c = _H264SwDecMalloc(92);
      HEAP32[a + 20 + (e << 2) >> 2] = c;
      c = HEAP32[a + 20 + (e << 2) >> 2] == 0 ? 2 : 3;
      do {
        if(c == 2) {
          d = 65535;
          c = 12;
          break a
        }else {
          if(c == 3) {
            c = 11;
            break a
          }
        }
      }while(0)
    }else {
      if(c == 4) {
        c = e == HEAP32[a + 8 >> 2] ? 5 : 9;
        do {
          if(c == 5) {
            c = _h264bsdCompareSeqParamSets(b, HEAP32[a + 16 >> 2]) != 0 ? 6 : 7;
            do {
              if(c == 6) {
                _H264SwDecFree(HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 40 >> 2]), HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 40 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 84 >> 2]), HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 84 >> 2] = 0, HEAP32[a + 8 >> 2] = 33, HEAP32[a + 4 >> 2] = 257, HEAP32[a + 16 >> 2] = 0, HEAP32[a + 12 >> 2] = 0
              }else {
                if(c == 7) {
                  _H264SwDecFree(HEAP32[b + 40 >> 2]);
                  HEAP32[b + 40 >> 2] = 0;
                  _H264SwDecFree(HEAP32[b + 84 >> 2]);
                  d = HEAP32[b + 84 >> 2] = 0;
                  c = 12;
                  break a
                }
              }
            }while(0)
          }else {
            c == 9 && (_H264SwDecFree(HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 40 >> 2]), HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 40 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 84 >> 2]), HEAP32[HEAP32[a + 20 + (e << 2) >> 2] + 84 >> 2] = 0)
          }
        }while(0);
        c = 11;
        break a
      }
    }
  }while(0);
  if(c == 11) {
    e = HEAP32[a + 20 + (e << 2) >> 2];
    var f;
    d = b;
    c = d + 92;
    if(e % 4 == d % 4) {
      for(;d % 4 !== 0 && d < c;) {
        HEAP8[e++] = HEAP8[d++]
      }
      d >>= 2;
      e >>= 2;
      for(f = c >> 2;d < f;) {
        HEAP32[e++] = HEAP32[d++]
      }
      d <<= 2;
      e <<= 2
    }
    for(;d < c;) {
      HEAP8[e++] = HEAP8[d++]
    }
    d = 0
  }
  return d
}
_h264bsdStoreSeqParamSet.X = 1;
function _h264bsdStorePicParamSet(a, b) {
  var c, d, e;
  e = HEAP32[b >> 2];
  c = HEAP32[a + 148 + (e << 2) >> 2] == 0 ? 1 : 4;
  a:do {
    if(c == 1) {
      c = _H264SwDecMalloc(72);
      HEAP32[a + 148 + (e << 2) >> 2] = c;
      c = HEAP32[a + 148 + (e << 2) >> 2] == 0 ? 2 : 3;
      do {
        if(c == 2) {
          d = 65535;
          c = 11;
          break a
        }else {
          if(c == 3) {
            c = 10;
            break a
          }
        }
      }while(0)
    }else {
      if(c == 4) {
        c = e == HEAP32[a + 4 >> 2] ? 5 : 8;
        c == 5 ? (c = HEAP32[b + 4 >> 2] != HEAP32[a + 8 >> 2] ? 6 : 7, c == 6 && (HEAP32[a + 4 >> 2] = 257), _H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 20 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 20 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 24 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 24 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 28 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 28 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 
        148 + (e << 2) >> 2] + 44 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 44 >> 2] = 0) : c == 8 && (_H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 20 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 20 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 24 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 24 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 28 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 28 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 
        148 + (e << 2) >> 2] + 44 >> 2]), HEAP32[HEAP32[a + 148 + (e << 2) >> 2] + 44 >> 2] = 0);
        c = 10;
        break a
      }
    }
  }while(0);
  if(c == 10) {
    e = HEAP32[a + 148 + (e << 2) >> 2];
    var f;
    d = b;
    c = d + 72;
    if(e % 4 == d % 4) {
      for(;d % 4 !== 0 && d < c;) {
        HEAP8[e++] = HEAP8[d++]
      }
      d >>= 2;
      e >>= 2;
      for(f = c >> 2;d < f;) {
        HEAP32[e++] = HEAP32[d++]
      }
      d <<= 2;
      e <<= 2
    }
    for(;d < c;) {
      HEAP8[e++] = HEAP8[d++]
    }
    d = 0
  }
  return d
}
_h264bsdStorePicParamSet.X = 1;
function _CheckPps(a, b) {
  var c, d, e, f;
  f = HEAP32[b + 52 >> 2] * HEAP32[b + 56 >> 2];
  c = HEAPU32[a + 12 >> 2] > 1 ? 1 : 32;
  a:do {
    if(c == 1) {
      c = HEAP32[a + 16 >> 2] == 0 ? 2 : 9;
      do {
        if(c == 2) {
          e = 0;
          c:for(;;) {
            if(!(e < HEAPU32[a + 12 >> 2])) {
              c = 8;
              break c
            }
            if(HEAPU32[HEAP32[a + 20 >> 2] + (e << 2) >> 2] > f) {
              c = 5;
              break c
            }
            e += 1
          }
          do {
            if(c != 8 && c == 5) {
              d = 1;
              c = 33;
              break a
            }
          }while(0)
        }else {
          if(c == 9) {
            c = HEAP32[a + 16 >> 2] == 2 ? 10 : 20;
            do {
              if(c == 10) {
                e = 0;
                d:for(;;) {
                  if(!(e < HEAP32[a + 12 >> 2] - 1)) {
                    c = 19;
                    break d
                  }
                  if(HEAPU32[HEAP32[a + 24 >> 2] + (e << 2) >> 2] > HEAPU32[HEAP32[a + 28 >> 2] + (e << 2) >> 2]) {
                    c = 14;
                    break d
                  }
                  if(HEAPU32[HEAP32[a + 28 >> 2] + (e << 2) >> 2] >= f) {
                    c = 14;
                    break d
                  }
                  if(HEAPU32[HEAP32[a + 24 >> 2] + (e << 2) >> 2] % HEAPU32[b + 52 >> 2] > HEAPU32[HEAP32[a + 28 >> 2] + (e << 2) >> 2] % HEAPU32[b + 52 >> 2]) {
                    c = 16;
                    break d
                  }
                  e += 1
                }
                do {
                  if(c != 19) {
                    if(c == 14) {
                      d = 1;
                      c = 33;
                      break a
                    }else {
                      if(c == 16) {
                        d = 1;
                        c = 33;
                        break a
                      }
                    }
                  }
                }while(0)
              }else {
                if(c == 20) {
                  c = HEAPU32[a + 16 >> 2] > 2 ? 21 : 25;
                  d:do {
                    if(c == 21) {
                      if(!(HEAPU32[a + 16 >> 2] < 6)) {
                        c = 25;
                        break d
                      }
                      c = HEAPU32[a + 36 >> 2] > f ? 23 : 24;
                      do {
                        if(c == 23) {
                          d = 1;
                          c = 33;
                          break a
                        }else {
                          if(c == 24) {
                            c = 29;
                            break d
                          }
                        }
                      }while(0)
                    }
                  }while(0);
                  do {
                    if(c == 25) {
                      c = HEAP32[a + 16 >> 2] == 6 ? 26 : 28;
                      e:do {
                        if(c == 26) {
                          if(!(HEAPU32[a + 40 >> 2] < f)) {
                            c = 28;
                            break e
                          }
                          d = 1;
                          c = 33;
                          break a
                        }
                      }while(0)
                    }
                  }while(0)
                }
              }
            }while(0)
          }
        }
      }while(0);
      c = 32;
      break a
    }
  }while(0);
  c == 32 && (d = 0);
  return d
}
_CheckPps.X = 1;
function _h264bsdResetStorage(a) {
  var b;
  HEAP32[a + 1196 >> 2] = 0;
  b = HEAP32[a + 1192 >> 2] = 0;
  a:for(;;) {
    if(!(b < HEAPU32[a + 1176 >> 2])) {
      break a
    }
    HEAP32[HEAP32[a + 1212 >> 2] + b * 216 + 4 >> 2] = 0;
    HEAP32[HEAP32[a + 1212 >> 2] + b * 216 + 196 >> 2] = 0;
    b += 1
  }
}
function _h264bsdIsStartOfPicture(a) {
  var b, a = HEAP32[a + 1188 >> 2] == 0 ? 1 : 2;
  a == 1 ? b = 1 : a == 2 && (b = 0);
  return b
}
function _h264bsdIsEndOfPicture(a) {
  var b, c, d;
  b = HEAP32[a + 1404 >> 2] != 0 ? 4 : 1;
  a:do {
    if(b == 4) {
      d = b = 0;
      b:for(;;) {
        if(!(b < HEAPU32[a + 1176 >> 2])) {
          break b
        }
        d += HEAP32[HEAP32[a + 1212 >> 2] + b * 216 + 196 >> 2] != 0 ? 1 : 0;
        b += 1
      }
      b = d == HEAP32[a + 1176 >> 2] ? 9 : 10;
      do {
        if(b == 9) {
          c = 1;
          b = 12;
          break a
        }else {
          if(b == 10) {
            b = 11;
            break a
          }
        }
      }while(0)
    }else {
      if(b == 1) {
        b = HEAP32[a + 1196 >> 2] == HEAP32[a + 1176 >> 2] ? 2 : 3;
        do {
          if(b == 2) {
            c = 1;
            b = 12;
            break a
          }else {
            if(b == 3) {
              b = 11;
              break a
            }
          }
        }while(0)
      }
    }
  }while(0);
  b == 11 && (c = 0);
  return c
}
_h264bsdIsEndOfPicture.X = 1;
function _h264bsdComputeSliceGroupMap(a, b) {
  _h264bsdDecodeSliceGroupMap(HEAP32[a + 1172 >> 2], HEAP32[a + 12 >> 2], b, HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2], HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2])
}
function _h264bsdActivateParamSets(a, b, c) {
  var d, e, f, g;
  d = HEAP32[a + 148 + (b << 2) >> 2] == 0 ? 2 : 1;
  a:do {
    if(d == 1) {
      if(HEAP32[a + 20 + (HEAP32[HEAP32[a + 148 + (b << 2) >> 2] + 4 >> 2] << 2) >> 2] == 0) {
        d = 2;
        break a
      }
      f = _CheckPps(HEAP32[a + 148 + (b << 2) >> 2], HEAP32[a + 20 + (HEAP32[HEAP32[a + 148 + (b << 2) >> 2] + 4 >> 2] << 2) >> 2]);
      d = f != 0 ? 4 : 5;
      do {
        if(d == 4) {
          e = f;
          d = 32;
          break a
        }else {
          if(d == 5) {
            d = HEAP32[a + 4 >> 2] == 256 ? 6 : 7;
            do {
              if(d == 6) {
                HEAP32[a + 4 >> 2] = b, HEAP32[a + 12 >> 2] = HEAP32[a + 148 + (b << 2) >> 2], HEAP32[a + 8 >> 2] = HEAP32[HEAP32[a + 12 >> 2] + 4 >> 2], HEAP32[a + 16 >> 2] = HEAP32[a + 20 + (HEAP32[a + 8 >> 2] << 2) >> 2], HEAP32[a + 1176 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2] * HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2], HEAP32[a + 1340 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2], HEAP32[a + 1344 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2], HEAP32[a + 3380 >> 2] = 1
              }else {
                if(d == 7) {
                  d = HEAP32[a + 3380 >> 2] != 0 ? 8 : 21;
                  d:do {
                    if(d == 8) {
                      HEAP32[a + 3380 >> 2] = 0;
                      _H264SwDecFree(HEAP32[a + 1212 >> 2]);
                      HEAP32[a + 1212 >> 2] = 0;
                      _H264SwDecFree(HEAP32[a + 1172 >> 2]);
                      HEAP32[a + 1172 >> 2] = 0;
                      d = _H264SwDecMalloc(HEAP32[a + 1176 >> 2] * 216);
                      HEAP32[a + 1212 >> 2] = d;
                      d = _H264SwDecMalloc(HEAP32[a + 1176 >> 2] << 2);
                      HEAP32[a + 1172 >> 2] = d;
                      d = HEAP32[a + 1212 >> 2] == 0 ? 10 : 9;
                      e:do {
                        if(d == 9) {
                          if(HEAP32[a + 1172 >> 2] == 0) {
                            break e
                          }
                          _H264SwDecMemset(HEAP32[a + 1212 >> 2], 0, HEAP32[a + 1176 >> 2] * 216);
                          _h264bsdInitMbNeighbours(HEAP32[a + 1212 >> 2], HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2], HEAP32[a + 1176 >> 2]);
                          d = HEAP32[a + 1216 >> 2] != 0 ? 16 : 12;
                          f:do {
                            if(d == 12) {
                              if(HEAP32[HEAP32[a + 16 >> 2] + 16 >> 2] == 2) {
                                d = 16;
                                break f
                              }
                              d = HEAP32[HEAP32[a + 16 >> 2] + 80 >> 2] != 0 ? 14 : 17;
                              g:do {
                                if(d == 14) {
                                  if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 920 >> 2] == 0) {
                                    break g
                                  }
                                  if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 944 >> 2] == 0) {
                                    d = 16;
                                    break f
                                  }
                                }
                              }while(0);
                              g = 0;
                              d = 18;
                              break f
                            }
                          }while(0);
                          d == 16 && (g = 1);
                          f = _h264bsdResetDpb(a + 1220, HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2] * HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2], HEAP32[HEAP32[a + 16 >> 2] + 88 >> 2], HEAP32[HEAP32[a + 16 >> 2] + 44 >> 2], HEAP32[HEAP32[a + 16 >> 2] + 12 >> 2], g);
                          d = f != 0 ? 19 : 20;
                          do {
                            if(d == 19) {
                              e = f;
                              d = 32;
                              break a
                            }else {
                              if(d == 20) {
                                d = 30;
                                break d
                              }
                            }
                          }while(0)
                        }
                      }while(0);
                      e = 65535;
                      d = 32;
                      break a
                    }else {
                      if(d == 21) {
                        d = b != HEAP32[a + 4 >> 2] ? 22 : 29;
                        do {
                          if(d == 22) {
                            d = HEAP32[HEAP32[a + 148 + (b << 2) >> 2] + 4 >> 2] != HEAP32[a + 8 >> 2] ? 23 : 27;
                            do {
                              if(d == 23) {
                                d = c != 0 ? 24 : 25;
                                do {
                                  if(d == 24) {
                                    HEAP32[a + 4 >> 2] = b, HEAP32[a + 12 >> 2] = HEAP32[a + 148 + (b << 2) >> 2], HEAP32[a + 8 >> 2] = HEAP32[HEAP32[a + 12 >> 2] + 4 >> 2], HEAP32[a + 16 >> 2] = HEAP32[a + 20 + (HEAP32[a + 8 >> 2] << 2) >> 2], HEAP32[a + 1176 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2] * HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2], HEAP32[a + 1340 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2], HEAP32[a + 1344 >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2], HEAP32[a + 3380 >> 2] = 1
                                  }else {
                                    if(d == 25) {
                                      e = 1;
                                      d = 32;
                                      break a
                                    }
                                  }
                                }while(0)
                              }else {
                                d == 27 && (HEAP32[a + 4 >> 2] = b, HEAP32[a + 12 >> 2] = HEAP32[a + 148 + (b << 2) >> 2])
                              }
                            }while(0)
                          }
                        }while(0)
                      }
                    }
                  }while(0)
                }
              }
            }while(0);
            e = 0;
            d = 32;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  d == 2 && (e = 1);
  return e
}
_h264bsdActivateParamSets.X = 1;
function _h264bsdDecodeSliceGroupMap(a, b, c, d, e) {
  var f, g, h, j, l;
  l = j = 0;
  h = d * e;
  f = HEAP32[b + 12 >> 2] == 1 ? 1 : 2;
  do {
    if(f == 1) {
      _H264SwDecMemset(a, 0, h << 2)
    }else {
      if(f == 2) {
        f = HEAPU32[b + 16 >> 2] > 2 ? 3 : 14;
        b:do {
          if(f == 3) {
            if(!(HEAPU32[b + 16 >> 2] < 6)) {
              break b
            }
            f = c * HEAP32[b + 36 >> 2] < h ? 5 : 6;
            if(f == 5) {
              var k = c * HEAP32[b + 36 >> 2]
            }else {
              f == 6 && (k = h)
            }
            j = k;
            f = HEAP32[b + 16 >> 2] == 4 ? 9 : 8;
            c:do {
              if(f == 8) {
                f = HEAP32[b + 16 >> 2] == 5 ? 9 : 13;
                break c
              }
            }while(0);
            if(f == 9) {
              f = HEAP32[b + 32 >> 2] != 0 ? 10 : 11;
              if(f == 10) {
                var m = h - j
              }else {
                f == 11 && (m = j)
              }
              l = m
            }
          }
        }while(0);
        f = HEAP32[b + 16 >> 2];
        f = f == 0 ? 15 : f == 1 ? 16 : f == 2 ? 17 : f == 3 ? 18 : f == 4 ? 19 : f == 5 ? 20 : 21;
        do {
          if(f == 21) {
            g = 0;
            c:for(;;) {
              if(!(g < h)) {
                f = 25;
                break c
              }
              HEAP32[a + (g << 2) >> 2] = HEAP32[HEAP32[b + 44 >> 2] + (g << 2) >> 2];
              g += 1
            }
          }else {
            f == 15 ? _DecodeInterleavedMap(a, HEAP32[b + 12 >> 2], HEAP32[b + 20 >> 2], h) : f == 16 ? _DecodeDispersedMap(a, HEAP32[b + 12 >> 2], d, e) : f == 17 ? _DecodeForegroundLeftOverMap(a, HEAP32[b + 12 >> 2], HEAP32[b + 24 >> 2], HEAP32[b + 28 >> 2], d, e) : f == 18 ? _DecodeBoxOutMap(a, HEAP32[b + 32 >> 2], j, d, e) : f == 19 ? _DecodeRasterScanMap(a, HEAP32[b + 32 >> 2], l, h) : f == 20 && _DecodeWipeMap(a, HEAP32[b + 32 >> 2], l, d, e)
          }
        }while(0)
      }
    }
  }while(0)
}
_h264bsdDecodeSliceGroupMap.X = 1;
function _DecodeInterleavedMap(a, b, c, d) {
  var e, f, g, h;
  f = 0;
  a:for(;;) {
    h = 0;
    b:for(;;) {
      if(h < b) {
        e = 3
      }else {
        var j = 0;
        e = 4
      }
      e == 3 && (j = f < d);
      if(!j) {
        break b
      }
      g = 0;
      c:for(;;) {
        if(g < HEAPU32[c + (h << 2) >> 2]) {
          e = 7
        }else {
          var l = 0;
          e = 8
        }
        e == 7 && (l = f + g < d);
        if(!l) {
          break c
        }
        HEAP32[a + (f + g << 2) >> 2] = h;
        g += 1
      }
      e = h;
      h = e + 1;
      f += HEAP32[c + (e << 2) >> 2]
    }
    if(!(f < d)) {
      break a
    }
  }
}
_DecodeInterleavedMap.X = 1;
function _h264bsdCheckAccessUnitBoundary(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 28;
  var f, g, h, j = e + 4, l = e + 8, k = e + 12, m = e + 16, n = e + 20, q;
  HEAP32[d >> 2] = 0;
  f = HEAPU32[b >> 2] > 5 ? 1 : 2;
  a:do {
    if(f == 1) {
      f = HEAPU32[b >> 2] < 12 ? 4 : 2;
      break a
    }
  }while(0);
  a:do {
    if(f == 2) {
      f = HEAPU32[b >> 2] > 12 ? 3 : 5;
      do {
        if(f == 3 && HEAPU32[b >> 2] <= 18) {
          f = 4;
          break a
        }
      }while(0);
      f = HEAP32[b >> 2] != 1 ? 6 : 8;
      b:do {
        if(f == 6) {
          if(HEAP32[b >> 2] == 5) {
            break b
          }
          g = 0;
          f = 64;
          break a
        }
      }while(0);
      f = HEAP32[c + 1332 >> 2] != 0 ? 10 : 11;
      f == 10 && (HEAP32[d >> 2] = 1, HEAP32[c + 1332 >> 2] = 0);
      h = _h264bsdCheckPpsId(a, e);
      f = h != 0 ? 12 : 13;
      do {
        if(f == 12) {
          g = h;
          f = 64;
          break a
        }else {
          if(f == 13) {
            q = HEAP32[c + 148 + (HEAP32[e >> 2] << 2) >> 2];
            f = q == 0 ? 18 : 14;
            c:do {
              if(f == 14) {
                if(HEAP32[c + 20 + (HEAP32[q + 4 >> 2] << 2) >> 2] == 0) {
                  break c
                }
                f = HEAP32[c + 8 >> 2] != 32 ? 16 : 19;
                d:do {
                  if(f == 16) {
                    if(HEAP32[q + 4 >> 2] == HEAP32[c + 8 >> 2]) {
                      break d
                    }
                    if(HEAP32[b >> 2] != 5) {
                      break c
                    }
                  }
                }while(0);
                g = HEAP32[c + 20 + (HEAP32[q + 4 >> 2] << 2) >> 2];
                f = HEAP32[c + 1304 >> 2] != HEAP32[b + 4 >> 2] ? 20 : 23;
                d:do {
                  if(f == 20) {
                    f = HEAP32[c + 1304 >> 2] == 0 ? 22 : 21;
                    do {
                      if(f == 21 && HEAP32[b + 4 >> 2] != 0) {
                        break d
                      }
                    }while(0);
                    HEAP32[d >> 2] = 1
                  }
                }while(0);
                f = HEAP32[c + 1300 >> 2] == 5 ? 24 : 25;
                d:do {
                  if(f == 24) {
                    f = HEAP32[b >> 2] != 5 ? 27 : 25;
                    break d
                  }
                }while(0);
                d:do {
                  if(f == 25) {
                    if(HEAP32[c + 1300 >> 2] == 5) {
                      f = 28;
                      break d
                    }
                    f = HEAP32[b >> 2] == 5 ? 27 : 28;
                    break d
                  }
                }while(0);
                f == 27 && (HEAP32[d >> 2] = 1);
                h = _h264bsdCheckFrameNum(a, HEAP32[g + 12 >> 2], j);
                f = h != 0 ? 29 : 30;
                do {
                  if(f == 29) {
                    g = 1;
                    f = 64;
                    break a
                  }else {
                    if(f == 30) {
                      f = HEAP32[c + 1308 >> 2] != HEAP32[j >> 2] ? 31 : 32;
                      f == 31 && (HEAP32[c + 1308 >> 2] = HEAP32[j >> 2], HEAP32[d >> 2] = 1);
                      f = HEAP32[b >> 2] == 5 ? 33 : 39;
                      do {
                        if(f == 33) {
                          h = _h264bsdCheckIdrPicId(a, HEAP32[g + 12 >> 2], HEAP32[b >> 2], l);
                          f = h != 0 ? 34 : 35;
                          do {
                            if(f == 34) {
                              g = 1;
                              f = 64;
                              break a
                            }else {
                              if(f == 35) {
                                f = HEAP32[c + 1300 >> 2] == 5 ? 36 : 38;
                                g:do {
                                  if(f == 36) {
                                    if(HEAP32[c + 1312 >> 2] == HEAP32[l >> 2]) {
                                      f = 38;
                                      break g
                                    }
                                    HEAP32[d >> 2] = 1
                                  }
                                }while(0);
                                HEAP32[c + 1312 >> 2] = HEAP32[l >> 2]
                              }
                            }
                          }while(0)
                        }
                      }while(0);
                      f = HEAP32[g + 16 >> 2] == 0 ? 40 : 51;
                      do {
                        if(f == 40) {
                          h = _h264bsdCheckPicOrderCntLsb(a, g, HEAP32[b >> 2], k);
                          f = h != 0 ? 41 : 42;
                          do {
                            if(f == 41) {
                              g = 1;
                              f = 64;
                              break a
                            }else {
                              if(f == 42) {
                                f = HEAP32[c + 1316 >> 2] != HEAP32[k >> 2] ? 43 : 44;
                                f == 43 && (HEAP32[c + 1316 >> 2] = HEAP32[k >> 2], HEAP32[d >> 2] = 1);
                                f = HEAP32[q + 8 >> 2] != 0 ? 45 : 50;
                                do {
                                  if(f == 45) {
                                    h = _h264bsdCheckDeltaPicOrderCntBottom(a, g, HEAP32[b >> 2], m);
                                    f = h != 0 ? 46 : 47;
                                    do {
                                      if(f == 46) {
                                        g = h;
                                        f = 64;
                                        break a
                                      }else {
                                        f == 47 && (f = HEAP32[c + 1320 >> 2] != HEAP32[m >> 2] ? 48 : 49, f == 48 && (HEAP32[c + 1320 >> 2] = HEAP32[m >> 2], HEAP32[d >> 2] = 1))
                                      }
                                    }while(0)
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }else {
                          if(f == 51) {
                            f = HEAP32[g + 16 >> 2] == 1 ? 52 : 62;
                            f:do {
                              if(f == 52) {
                                if(HEAP32[g + 24 >> 2] != 0) {
                                  f = 62;
                                  break f
                                }
                                h = _h264bsdCheckDeltaPicOrderCnt(a, g, HEAP32[b >> 2], HEAP32[q + 8 >> 2], n);
                                f = h != 0 ? 54 : 55;
                                do {
                                  if(f == 54) {
                                    g = h;
                                    f = 64;
                                    break a
                                  }else {
                                    f == 55 && (f = HEAP32[c + 1324 >> 2] != HEAP32[n >> 2] ? 56 : 57, f == 56 && (HEAP32[c + 1324 >> 2] = HEAP32[n >> 2], HEAP32[d >> 2] = 1), f = HEAP32[q + 8 >> 2] != 0 ? 58 : 61, f == 58 && (f = HEAP32[c + 1328 >> 2] != HEAP32[n + 4 >> 2] ? 59 : 60, f == 59 && (HEAP32[c + 1328 >> 2] = HEAP32[n + 4 >> 2], HEAP32[d >> 2] = 1)))
                                  }
                                }while(0)
                              }
                            }while(0)
                          }
                        }
                      }while(0);
                      a = b;
                      c += 1300;
                      for(b = a + 8;a < b;) {
                        HEAP8[c++] = HEAP8[a++]
                      }
                      g = 0;
                      f = 64;
                      break a
                    }
                  }
                }while(0)
              }
            }while(0);
            g = 65520;
            f = 64;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  f == 4 && (HEAP32[d >> 2] = 1, g = 0);
  STACKTOP = e;
  return g
}
_h264bsdCheckAccessUnitBoundary.X = 1;
function _h264bsdValidParamSets(a) {
  var b, c, d;
  d = 0;
  a:for(;;) {
    if(!(d < 256)) {
      b = 8;
      break a
    }
    b = HEAP32[a + 148 + (d << 2) >> 2] != 0 ? 3 : 6;
    b:do {
      if(b == 3) {
        if(HEAP32[a + 20 + (HEAP32[HEAP32[a + 148 + (d << 2) >> 2] + 4 >> 2] << 2) >> 2] == 0) {
          b = 6;
          break b
        }
        if(_CheckPps(HEAP32[a + 148 + (d << 2) >> 2], HEAP32[a + 20 + (HEAP32[HEAP32[a + 148 + (d << 2) >> 2] + 4 >> 2] << 2) >> 2]) == 0) {
          b = 5;
          break a
        }
      }
    }while(0);
    d += 1
  }
  b == 8 ? c = 1 : b == 5 && (c = 0);
  return c
}
_h264bsdValidParamSets.X = 1;
function _DecodeDispersedMap(a, b, c, d) {
  var e;
  e = c * d;
  d = 0;
  a:for(;;) {
    if(!(d < e)) {
      break a
    }
    HEAP32[a + (d << 2) >> 2] = (d % c + (Math.floor(d / c) * b >>> 1)) % b;
    d += 1
  }
}
function _DecodeForegroundLeftOverMap(a, b, c, d, e, f) {
  var g, h, j, l;
  j = e * f;
  f = 0;
  a:for(;;) {
    if(!(f < j)) {
      break a
    }
    HEAP32[a + (f << 2) >> 2] = b - 1;
    f += 1
  }
  b -= 1;
  a:for(;;) {
    f = b;
    b = f - 1;
    if(f == 0) {
      break a
    }
    g = Math.floor(HEAPU32[c + (b << 2) >> 2] / e);
    j = HEAPU32[c + (b << 2) >> 2] % e;
    f = Math.floor(HEAPU32[d + (b << 2) >> 2] / e);
    l = HEAPU32[d + (b << 2) >> 2] % e;
    b:for(;;) {
      if(!(g <= f)) {
        break b
      }
      h = j;
      c:for(;;) {
        if(!(h <= l)) {
          break c
        }
        HEAP32[a + (g * e + h << 2) >> 2] = b;
        h += 1
      }
      g += 1
    }
  }
}
_DecodeForegroundLeftOverMap.X = 1;
function _DecodeBoxOutMap(a, b, c, d, e) {
  var f, g, h, j, l, k, m, n, q, p, o;
  g = d * e;
  f = 0;
  a:for(;;) {
    if(!(f < g)) {
      break a
    }
    HEAP32[a + (f << 2) >> 2] = 1;
    f += 1
  }
  h = d - b >>> 1;
  j = e - b >>> 1;
  m = h;
  n = j;
  q = h;
  p = j;
  l = b - 1;
  k = b;
  g = 0;
  a:for(;;) {
    if(!(g < c)) {
      break a
    }
    o = HEAP32[a + (j * d + h << 2) >> 2] == 1 ? 1 : 0;
    f = o != 0 ? 7 : 8;
    f == 7 && (HEAP32[a + (j * d + h << 2) >> 2] = 0);
    f = l == -1 ? 9 : 14;
    b:do {
      if(f == 9) {
        if(h != m) {
          f = 14;
          break b
        }
        f = m - 1 > 0 ? 11 : 12;
        if(f == 11) {
          var r = m - 1
        }else {
          f == 12 && (r = 0)
        }
        h = m = r;
        l = 0;
        k = (b << 1) - 1;
        f = 36;
        break b
      }
    }while(0);
    do {
      if(f == 14) {
        f = l == 1 ? 15 : 20;
        c:do {
          if(f == 15) {
            if(h != q) {
              f = 20;
              break c
            }
            f = q + 1 < d - 1 ? 17 : 18;
            if(f == 17) {
              var s = q + 1
            }else {
              f == 18 && (s = d - 1)
            }
            h = q = s;
            l = 0;
            k = 1 - (b << 1);
            f = 35;
            break c
          }
        }while(0);
        do {
          if(f == 20) {
            f = k == -1 ? 21 : 26;
            d:do {
              if(f == 21) {
                if(j != n) {
                  f = 26;
                  break d
                }
                f = n - 1 > 0 ? 23 : 24;
                if(f == 23) {
                  var t = n - 1
                }else {
                  f == 24 && (t = 0)
                }
                j = n = t;
                l = 1 - (b << 1);
                k = 0;
                f = 34;
                break d
              }
            }while(0);
            do {
              if(f == 26) {
                f = k == 1 ? 27 : 32;
                e:do {
                  if(f == 27) {
                    if(j != p) {
                      f = 32;
                      break e
                    }
                    f = p + 1 < e - 1 ? 29 : 30;
                    if(f == 29) {
                      var u = p + 1
                    }else {
                      f == 30 && (u = e - 1)
                    }
                    j = p = u;
                    l = (b << 1) - 1;
                    k = 0;
                    f = 33;
                    break e
                  }
                }while(0);
                f == 32 && (h += l, j += k)
              }
            }while(0)
          }
        }while(0)
      }
    }while(0);
    g += o != 0 ? 1 : 0
  }
}
_DecodeBoxOutMap.X = 1;
function _DecodeRasterScanMap(a, b, c, d) {
  var e, f;
  f = 0;
  a:for(;;) {
    if(!(f < d)) {
      break a
    }
    e = f < c ? 3 : 4;
    e == 3 ? HEAP32[a + (f << 2) >> 2] = b : e == 4 && (HEAP32[a + (f << 2) >> 2] = 1 - b);
    f += 1
  }
}
function _DecodeWipeMap(a, b, c, d, e) {
  var f, g, h, j;
  h = j = 0;
  a:for(;;) {
    if(!(h < d)) {
      break a
    }
    g = 0;
    b:for(;;) {
      if(!(g < e)) {
        break b
      }
      f = j;
      j = f + 1;
      f = f < c ? 5 : 6;
      f == 5 ? HEAP32[a + (g * d + h << 2) >> 2] = b : f == 6 && (HEAP32[a + (g * d + h << 2) >> 2] = 1 - b);
      g += 1
    }
    h += 1
  }
}
_DecodeWipeMap.X = 1;
function _h264bsdIntraPrediction(a, b, c, d, e, f) {
  var g = STACKTOP;
  STACKTOP += 72;
  var h, j = g + 40, l;
  _h264bsdGetNeighbourPels(c, g, j, d);
  d = _h264bsdMbPartPredMode(HEAP32[a >> 2]) == 1 ? 1 : 4;
  a:do {
    if(d == 1) {
      l = _h264bsdIntra16x16Prediction(a, f, b + 328, g, j, e);
      d = l != 0 ? 2 : 3;
      do {
        if(d == 2) {
          h = l;
          d = 12;
          break a
        }else {
          if(d == 3) {
            d = 7;
            break a
          }
        }
      }while(0)
    }else {
      if(d == 4) {
        l = _h264bsdIntra4x4Prediction(a, f, b, g, j, e);
        d = l != 0 ? 5 : 6;
        do {
          if(d == 5) {
            h = l;
            d = 12;
            break a
          }else {
            if(d == 6) {
              d = 7;
              break a
            }
          }
        }while(0)
      }
    }
  }while(0);
  d == 7 && (l = _h264bsdIntraChromaPrediction(a, f + 256, b + 1352, g + 21, j + 16, HEAP32[b + 140 >> 2], e), d = l != 0 ? 8 : 9, d == 8 ? h = l : d == 9 && (d = HEAPU32[a + 196 >> 2] > 1 ? 10 : 11, d == 10 ? h = 0 : d == 11 && (_h264bsdWriteMacroblock(c, f), h = 0)));
  STACKTOP = g;
  return h
}
_h264bsdIntraPrediction.X = 1;
function _h264bsdGetNeighbourPels(a, b, c, d) {
  var e, f, g, h, j, l, k, m;
  e = c;
  c = d != 0 ? 2 : 1;
  a:do {
    if(c == 2) {
      g = HEAP32[a + 4 >> 2];
      h = g * HEAP32[a + 8 >> 2];
      k = Math.floor(d / g);
      m = d - k * g;
      g <<= 4;
      j = HEAP32[a >> 2] + (k << 4) * g + (m << 4);
      c = k != 0 ? 3 : 7;
      do {
        if(c == 3) {
          l = j + -(g + 1);
          f = 21;
          c:for(;;) {
            var n = f;
            f = n - 1;
            if(n == 0) {
              c = 6;
              break c
            }
            n = l;
            l = n + 1;
            var n = HEAP8[n], q = b, b = q + 1;
            HEAP8[q] = n
          }
        }
      }while(0);
      c = m != 0 ? 8 : 13;
      do {
        if(c == 8) {
          j -= 1;
          f = 16;
          c:for(;;) {
            l = f;
            f = l - 1;
            if(l == 0) {
              c = 12;
              break c
            }
            l = HEAP8[j];
            n = e;
            e = n + 1;
            HEAP8[n] = l;
            j += g
          }
        }
      }while(0);
      g >>>= 1;
      j = HEAP32[a >> 2] + (h << 8) + (k << 3) * g + (m << 3);
      c = k != 0 ? 14 : 21;
      do {
        if(c == 14) {
          l = j + -(g + 1);
          f = 9;
          c:for(;;) {
            k = f;
            f = k - 1;
            if(k == 0) {
              c = 17;
              break c
            }
            k = l;
            l = k + 1;
            k = HEAP8[k];
            n = b;
            b = n + 1;
            HEAP8[n] = k
          }
          l += (h << 6) - 9;
          f = 9;
          c:for(;;) {
            k = f;
            f = k - 1;
            if(k == 0) {
              c = 20;
              break c
            }
            k = l;
            l = k + 1;
            k = HEAP8[k];
            n = b;
            b = n + 1;
            HEAP8[n] = k
          }
        }
      }while(0);
      if(m == 0) {
        break a
      }
      j -= 1;
      f = 8;
      b:for(;;) {
        m = f;
        f = m - 1;
        if(m == 0) {
          c = 26;
          break b
        }
        m = HEAP8[j];
        l = e;
        e = l + 1;
        HEAP8[l] = m;
        j += g
      }
      j += (h << 6) - (g << 3);
      f = 8;
      b:for(;;) {
        h = f;
        f = h - 1;
        if(h == 0) {
          c = 30;
          break b
        }
        h = HEAP8[j];
        m = e;
        e = m + 1;
        HEAP8[m] = h;
        j += g
      }
    }
  }while(0)
}
_h264bsdGetNeighbourPels.X = 1;
function _h264bsdIntra16x16Prediction(a, b, c, d, e, f) {
  var g, h, j, l, k;
  j = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 200 >> 2]);
  g = j != 0 ? 1 : 4;
  a:do {
    if(g == 1) {
      if(f == 0) {
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 200 >> 2] >> 2]) != 2) {
        break a
      }
      j = 0
    }
  }while(0);
  l = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 204 >> 2]);
  g = l != 0 ? 5 : 8;
  a:do {
    if(g == 5) {
      if(f == 0) {
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 204 >> 2] >> 2]) != 2) {
        break a
      }
      l = 0
    }
  }while(0);
  k = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 212 >> 2]);
  g = k != 0 ? 9 : 12;
  a:do {
    if(g == 9) {
      if(f == 0) {
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 212 >> 2] >> 2]) != 2) {
        break a
      }
      k = 0
    }
  }while(0);
  g = _h264bsdPredModeIntra16x16(HEAP32[a >> 2]);
  g = g == 0 ? 13 : g == 1 ? 16 : g == 2 ? 19 : 20;
  a:do {
    if(g == 20) {
      g = j != 0 ? 21 : 23;
      b:do {
        if(g == 21) {
          if(l == 0) {
            break b
          }
          if(k == 0) {
            break b
          }
          _Intra16x16PlanePrediction(b, d + 1, e);
          g = 25;
          break a
        }
      }while(0);
      h = 1;
      g = 30;
      break a
    }else {
      if(g == 13) {
        g = l != 0 ? 15 : 14;
        do {
          if(g == 15) {
            _Intra16x16VerticalPrediction(b, d + 1);
            g = 25;
            break a
          }else {
            if(g == 14) {
              h = 1;
              g = 30;
              break a
            }
          }
        }while(0)
      }else {
        if(g == 16) {
          g = j != 0 ? 18 : 17;
          do {
            if(g == 18) {
              _Intra16x16HorizontalPrediction(b, e);
              g = 25;
              break a
            }else {
              if(g == 17) {
                h = 1;
                g = 30;
                break a
              }
            }
          }while(0)
        }else {
          if(g == 19) {
            _Intra16x16DcPrediction(b, d + 1, e, j, l);
            g = 25;
            break a
          }
        }
      }
    }
  }while(0);
  do {
    if(g == 25) {
      d = 0;
      b:for(;;) {
        if(!(d < 16)) {
          g = 29;
          break b
        }
        _h264bsdAddResidual(b, c + (d << 6), d);
        d += 1
      }
      h = 0
    }
  }while(0);
  return h
}
_h264bsdIntra16x16Prediction.X = 1;
function _Intra16x16VerticalPrediction(a, b) {
  var c, d, e;
  c = a;
  d = 0;
  a:for(;;) {
    if(!(d < 16)) {
      break a
    }
    e = 0;
    b:for(;;) {
      if(!(e < 16)) {
        break b
      }
      var f = HEAP8[b + e], g = c;
      c = g + 1;
      HEAP8[g] = f;
      e += 1
    }
    d += 1
  }
}
function _Intra16x16HorizontalPrediction(a, b) {
  var c, d, e;
  c = a;
  d = 0;
  a:for(;;) {
    if(!(d < 16)) {
      break a
    }
    e = 0;
    b:for(;;) {
      if(!(e < 16)) {
        break b
      }
      var f = HEAP8[b + d], g = c;
      c = g + 1;
      HEAP8[g] = f;
      e += 1
    }
    d += 1
  }
}
function _h264bsdIntra4x4Prediction(a, b, c, d, e, f) {
  var g = STACKTOP;
  STACKTOP += 52;
  var h, j, l, k, m = g + 8, n, q, p = g + 16, o = g + 28, r = g + 36, s, t, u;
  l = 0;
  a:for(;;) {
    if(!(l < 16)) {
      h = 58;
      break a
    }
    t = _h264bsdNeighbour4x4BlockA(l);
    s = g;
    var v;
    h = t;
    u = s;
    for(v = h + 8;h < v;) {
      HEAP8[u++] = HEAP8[h++]
    }
    n = _h264bsdGetNeighbourMb(a, HEAP32[g >> 2]);
    s = _h264bsdIsNeighbourAvailable(a, n);
    h = s != 0 ? 3 : 6;
    b:do {
      if(h == 3) {
        if(f == 0) {
          break b
        }
        if(_h264bsdMbPartPredMode(HEAP32[n >> 2]) != 2) {
          break b
        }
        s = 0
      }
    }while(0);
    q = _h264bsdNeighbour4x4BlockB(l);
    t = m;
    h = q;
    u = t;
    for(v = h + 8;h < v;) {
      HEAP8[u++] = HEAP8[h++]
    }
    q = _h264bsdGetNeighbourMb(a, HEAP32[m >> 2]);
    t = _h264bsdIsNeighbourAvailable(a, q);
    h = t != 0 ? 7 : 10;
    b:do {
      if(h == 7) {
        if(f == 0) {
          break b
        }
        if(_h264bsdMbPartPredMode(HEAP32[q >> 2]) != 2) {
          break b
        }
        t = 0
      }
    }while(0);
    k = c;
    if(s != 0) {
      h = 11
    }else {
      var w = 0;
      h = 12
    }
    h == 11 && (w = t != 0);
    k = _DetermineIntra4x4PredMode(k, w, g, m, l, n, q);
    HEAP8[l + (a + 82)] = k & 255;
    n = _h264bsdNeighbour4x4BlockC(l);
    q = g;
    h = n;
    u = q;
    for(v = h + 8;h < v;) {
      HEAP8[u++] = HEAP8[h++]
    }
    n = _h264bsdGetNeighbourMb(a, HEAP32[g >> 2]);
    q = _h264bsdIsNeighbourAvailable(a, n);
    h = q != 0 ? 13 : 16;
    b:do {
      if(h == 13) {
        if(f == 0) {
          break b
        }
        if(_h264bsdMbPartPredMode(HEAP32[n >> 2]) != 2) {
          break b
        }
        q = 0
      }
    }while(0);
    h = _h264bsdNeighbour4x4BlockD(l);
    u = n = g;
    for(v = h + 8;h < v;) {
      HEAP8[u++] = HEAP8[h++]
    }
    n = _h264bsdGetNeighbourMb(a, HEAP32[g >> 2]);
    u = _h264bsdIsNeighbourAvailable(a, n);
    h = u != 0 ? 17 : 20;
    b:do {
      if(h == 17) {
        if(f == 0) {
          break b
        }
        if(_h264bsdMbPartPredMode(HEAP32[n >> 2]) != 2) {
          break b
        }
        u = 0
      }
    }while(0);
    _Get4x4NeighbourPels(p, o, b, d, e, l);
    h = k == 0 ? 21 : k == 1 ? 24 : k == 2 ? 27 : k == 3 ? 28 : k == 4 ? 33 : k == 5 ? 38 : k == 6 ? 43 : k == 7 ? 48 : 53;
    do {
      if(h == 53) {
        if(s == 0) {
          h = 54;
          break a
        }
        _Intra4x4HorizontalUpPrediction(r, o + 1)
      }else {
        if(h == 21) {
          if(t == 0) {
            h = 22;
            break a
          }
          _Intra4x4VerticalPrediction(r, p + 1)
        }else {
          if(h == 24) {
            if(s == 0) {
              h = 25;
              break a
            }
            _Intra4x4HorizontalPrediction(r, o + 1)
          }else {
            if(h == 27) {
              _Intra4x4DcPrediction(r, p + 1, o + 1, s, t)
            }else {
              if(h == 28) {
                if(t == 0) {
                  h = 29;
                  break a
                }
                h = q != 0 ? 32 : 31;
                h == 31 && (k = HEAP8[p + 4], HEAP8[p + 8] = k, HEAP8[p + 7] = k, HEAP8[p + 6] = k, HEAP8[p + 5] = k);
                _Intra4x4DiagonalDownLeftPrediction(r, p + 1)
              }else {
                if(h == 33) {
                  if(s == 0) {
                    h = 36;
                    break a
                  }
                  if(t == 0) {
                    h = 36;
                    break a
                  }
                  if(u == 0) {
                    h = 36;
                    break a
                  }
                  _Intra4x4DiagonalDownRightPrediction(r, p + 1, o + 1)
                }else {
                  if(h == 38) {
                    if(s == 0) {
                      h = 41;
                      break a
                    }
                    if(t == 0) {
                      h = 41;
                      break a
                    }
                    if(u == 0) {
                      h = 41;
                      break a
                    }
                    _Intra4x4VerticalRightPrediction(r, p + 1, o + 1)
                  }else {
                    if(h == 43) {
                      if(s == 0) {
                        h = 46;
                        break a
                      }
                      if(t == 0) {
                        h = 46;
                        break a
                      }
                      if(u == 0) {
                        h = 46;
                        break a
                      }
                      _Intra4x4HorizontalDownPrediction(r, p + 1, o + 1)
                    }else {
                      if(h == 48) {
                        if(t == 0) {
                          h = 49;
                          break a
                        }
                        h = q != 0 ? 52 : 51;
                        h == 51 && (k = HEAP8[p + 4], HEAP8[p + 8] = k, HEAP8[p + 7] = k, HEAP8[p + 6] = k, HEAP8[p + 5] = k);
                        _Intra4x4VerticalLeftPrediction(r, p + 1)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }while(0);
    _Write4x4To16x16(b, r, l);
    _h264bsdAddResidual(b, c + 328 + (l << 6), l);
    l += 1
  }
  h == 58 ? j = 0 : h == 22 ? j = 1 : h == 25 ? j = 1 : h == 29 ? j = 1 : h == 36 ? j = 1 : h == 41 ? j = 1 : h == 46 ? j = 1 : h == 49 ? j = 1 : h == 54 && (j = 1);
  STACKTOP = g;
  return j
}
_h264bsdIntra4x4Prediction.X = 1;
function _h264bsdIntraChromaPrediction(a, b, c, d, e, f, g) {
  var h, j, l, k, m, n;
  j = e;
  k = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 200 >> 2]);
  e = k != 0 ? 1 : 4;
  a:do {
    if(e == 1) {
      if(g == 0) {
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 200 >> 2] >> 2]) != 2) {
        break a
      }
      k = 0
    }
  }while(0);
  m = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 204 >> 2]);
  e = m != 0 ? 5 : 8;
  a:do {
    if(e == 5) {
      if(g == 0) {
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 204 >> 2] >> 2]) != 2) {
        break a
      }
      m = 0
    }
  }while(0);
  n = _h264bsdIsNeighbourAvailable(a, HEAP32[a + 212 >> 2]);
  e = n != 0 ? 9 : 12;
  a:do {
    if(e == 9) {
      if(g == 0) {
        e = 12;
        break a
      }
      if(_h264bsdMbPartPredMode(HEAP32[HEAP32[a + 212 >> 2] >> 2]) != 2) {
        e = 12;
        break a
      }
      n = 0
    }
  }while(0);
  g = 0;
  l = 16;
  a:for(;;) {
    if(!(g < 2)) {
      e = 33;
      break a
    }
    e = f == 0 ? 15 : f == 1 ? 16 : f == 2 ? 19 : 22;
    do {
      if(e == 22) {
        if(k == 0) {
          e = 25;
          break a
        }
        if(m == 0) {
          e = 25;
          break a
        }
        if(n == 0) {
          e = 25;
          break a
        }
        _IntraChromaPlanePrediction(b, d + 1, j)
      }else {
        if(e == 15) {
          _IntraChromaDcPrediction(b, d + 1, j, k, m)
        }else {
          if(e == 16) {
            if(k == 0) {
              e = 17;
              break a
            }
            _IntraChromaHorizontalPrediction(b, j)
          }else {
            if(e == 19) {
              if(m == 0) {
                e = 20;
                break a
              }
              _IntraChromaVerticalPrediction(b, d + 1)
            }
          }
        }
      }
    }while(0);
    a = 0;
    b:for(;;) {
      if(!(a < 4)) {
        e = 31;
        break b
      }
      _h264bsdAddResidual(b, c + (a << 6), l);
      a += 1;
      l += 1
    }
    b += 64;
    d += 9;
    j += 8;
    c += 256;
    g += 1
  }
  e == 33 ? h = 0 : e == 17 ? h = 1 : e == 20 ? h = 1 : e == 25 && (h = 1);
  return h
}
_h264bsdIntraChromaPrediction.X = 1;
function _Intra16x16DcPrediction(a, b, c, d, e) {
  var f, g, h;
  f = d != 0 ? 1 : 7;
  a:do {
    if(f == 1) {
      if(e == 0) {
        f = 7;
        break a
      }
      h = g = 0;
      b:for(;;) {
        if(!(g < 16)) {
          break b
        }
        h += HEAPU8[b + g] + HEAPU8[c + g];
        g += 1
      }
      h = h + 16 >>> 5;
      f = 22;
      break a
    }
  }while(0);
  do {
    if(f == 7) {
      f = d != 0 ? 8 : 13;
      do {
        if(f == 8) {
          h = g = 0;
          c:for(;;) {
            if(!(g < 16)) {
              f = 12;
              break c
            }
            h += HEAPU8[c + g];
            g += 1
          }
          h = h + 8 >>> 4
        }else {
          if(f == 13) {
            f = e != 0 ? 14 : 19;
            do {
              if(f == 14) {
                h = g = 0;
                d:for(;;) {
                  if(!(g < 16)) {
                    f = 18;
                    break d
                  }
                  h += HEAPU8[b + g];
                  g += 1
                }
                h = h + 8 >>> 4
              }else {
                f == 19 && (h = 128)
              }
            }while(0)
          }
        }
      }while(0)
    }
  }while(0);
  g = 0;
  a:for(;;) {
    if(!(g < 256)) {
      break a
    }
    HEAP8[a + g] = h & 255;
    g += 1
  }
}
_Intra16x16DcPrediction.X = 1;
function _Intra16x16PlanePrediction(a, b, c) {
  var d, e, f, g, h;
  e = HEAPU8[b + 15] + HEAPU8[c + 15] << 4;
  f = d = 0;
  a:for(;;) {
    if(!(d < 8)) {
      break a
    }
    f += (d + 1) * (HEAPU8[d + (b + 8)] - HEAPU8[b + (6 - d)]);
    d += 1
  }
  f = f * 5 + 32 >> 6;
  g = d = 0;
  a:for(;;) {
    if(!(d < 7)) {
      break a
    }
    g += (d + 1) * (HEAPU8[d + (c + 8)] - HEAPU8[c + (6 - d)]);
    d += 1
  }
  g += (d + 1) * (HEAPU8[d + (c + 8)] - HEAPU8[b - 1]);
  g = g * 5 + 32 >> 6;
  d = 0;
  a:for(;;) {
    if(!(d < 16)) {
      break a
    }
    c = 0;
    b:for(;;) {
      if(!(c < 16)) {
        break b
      }
      h = e + f * (c - 7) + g * (d - 7) + 16 >> 5;
      b = h < 0 ? 13 : 14;
      if(b == 13) {
        var j = 0
      }else {
        if(b == 14) {
          b = h > 255 ? 15 : 16;
          if(b == 15) {
            var l = 255
          }else {
            b == 16 && (l = h)
          }
          j = l
        }
      }
      HEAP8[a + ((d << 4) + c)] = j & 255;
      c += 1
    }
    d += 1
  }
}
_Intra16x16PlanePrediction.X = 1;
function _h264bsdAddResidual(a, b, c) {
  var d, e, f, g, h, j, l, k, m, n, q;
  d = b;
  q = _h264bsdClip + 512;
  b = HEAP32[d >> 2] == 16777215 ? 1 : 2;
  a:do {
    if(b != 1 && b == 2) {
      b = c < 16 ? 3 : 4;
      b == 3 ? (h = 16, f = HEAP32[_h264bsdBlockX + (c << 2) >> 2], g = HEAP32[_h264bsdBlockY + (c << 2) >> 2]) : b == 4 && (h = 8, f = HEAP32[_h264bsdBlockX + ((c & 3) << 2) >> 2], g = HEAP32[_h264bsdBlockY + ((c & 3) << 2) >> 2]);
      n = a + g * h + f;
      e = 4;
      for(;;) {
        if(e == 0) {
          break a
        }
        j = d;
        d = j + 4;
        j = HEAP32[j >> 2];
        l = HEAPU8[n];
        k = d;
        d = k + 4;
        k = HEAP32[k >> 2];
        m = HEAPU8[n + 1];
        HEAP8[n] = HEAP8[q + (j + l)];
        j = d;
        d = j + 4;
        j = HEAP32[j >> 2];
        l = HEAPU8[n + 2];
        HEAP8[n + 1] = HEAP8[q + (k + m)];
        k = d;
        d = k + 4;
        k = HEAP32[k >> 2];
        m = HEAPU8[n + 3];
        j = HEAPU8[q + (j + l)];
        k = HEAPU8[q + (k + m)];
        HEAP8[n + 2] = j & 255;
        HEAP8[n + 3] = k & 255;
        n += h;
        e -= 1
      }
    }
  }while(0)
}
_h264bsdAddResidual.X = 1;
function _DetermineIntra4x4PredMode(a, b, c, d, e, f, g) {
  var h, j, b = b != 0 ? 2 : 1;
  if(b == 2) {
    b = _h264bsdMbPartPredMode(HEAP32[f >> 2]) == 0 ? 3 : 4;
    b == 3 ? h = HEAPU8[f + 82 + HEAPU8[c + 4]] : b == 4 && (h = 2);
    f = g;
    b = _h264bsdMbPartPredMode(HEAP32[f >> 2]) == 0 ? 6 : 7;
    b == 6 ? j = HEAPU8[f + 82 + HEAPU8[d + 4]] : b == 7 && (j = 2);
    b = h < j ? 9 : 10;
    if(b == 9) {
      var l = h
    }else {
      b == 10 && (l = j)
    }
    h = l
  }else {
    b == 1 && (h = 2)
  }
  b = HEAP32[a + 12 + (e << 2) >> 2] != 0 ? 17 : 13;
  b == 13 && (b = HEAPU32[a + 76 + (e << 2) >> 2] < h ? 14 : 15, b == 14 ? h = HEAP32[a + 76 + (e << 2) >> 2] : b == 15 && (h = HEAP32[a + 76 + (e << 2) >> 2] + 1));
  return h
}
_DetermineIntra4x4PredMode.X = 1;
function _Get4x4NeighbourPels(a, b, c, d, e, f) {
  var g, h, j;
  h = HEAP32[_h264bsdBlockX + (f << 2) >> 2];
  f = HEAP32[_h264bsdBlockY + (f << 2) >> 2];
  g = h == 0 ? 1 : 2;
  g == 1 ? (g = HEAP8[e + f], j = HEAP8[f + (e + 1)], HEAP8[b + 1] = g, HEAP8[b + 2] = j, g = HEAP8[f + (e + 2)], j = HEAP8[f + (e + 3)], HEAP8[b + 3] = g, HEAP8[b + 4] = j) : g == 2 && (g = HEAP8[c + ((f << 4) + h - 1)], j = HEAP8[c + ((f << 4) + h - 1 + 16)], HEAP8[b + 1] = g, HEAP8[b + 2] = j, g = HEAP8[c + ((f << 4) + h - 1 + 32)], j = HEAP8[c + ((f << 4) + h - 1 + 48)], HEAP8[b + 3] = g, HEAP8[b + 4] = j);
  g = f == 0 ? 4 : 5;
  g == 4 ? (g = HEAP8[d + h], j = HEAP8[d + h], HEAP8[b] = g, HEAP8[a] = j, g = HEAP8[h + (d + 1)], j = HEAP8[h + (d + 2)], HEAP8[a + 1] = g, HEAP8[a + 2] = j, g = HEAP8[h + (d + 3)], j = HEAP8[h + (d + 4)], HEAP8[a + 3] = g, HEAP8[a + 4] = j, g = HEAP8[h + (d + 5)], j = HEAP8[h + (d + 6)], HEAP8[a + 5] = g, HEAP8[a + 6] = j, g = HEAP8[h + (d + 7)], j = HEAP8[h + (d + 8)], HEAP8[a + 7] = g, HEAP8[a + 8] = j) : g == 5 && (g = HEAP8[c + ((f - 1 << 4) + h)], j = HEAP8[c + ((f - 1 << 4) + h + 1)], HEAP8[a + 
  1] = g, HEAP8[a + 2] = j, g = HEAP8[c + ((f - 1 << 4) + h + 2)], j = HEAP8[c + ((f - 1 << 4) + h + 3)], HEAP8[a + 3] = g, HEAP8[a + 4] = j, g = HEAP8[c + ((f - 1 << 4) + h + 4)], j = HEAP8[c + ((f - 1 << 4) + h + 5)], HEAP8[a + 5] = g, HEAP8[a + 6] = j, g = HEAP8[c + ((f - 1 << 4) + h + 6)], j = HEAP8[c + ((f - 1 << 4) + h + 7)], HEAP8[a + 7] = g, HEAP8[a + 8] = j, g = h == 0 ? 6 : 7, g == 6 ? (c = HEAP8[e + (f - 1)], HEAP8[a] = c, HEAP8[b] = c) : g == 7 && (c = HEAP8[c + ((f - 1 << 4) + h - 1)], 
  HEAP8[a] = c, HEAP8[b] = c))
}
_Get4x4NeighbourPels.X = 1;
function _Intra4x4VerticalPrediction(a, b) {
  var c, d;
  c = HEAP8[b];
  d = HEAP8[b + 1];
  HEAP8[a + 12] = c;
  HEAP8[a + 8] = c;
  HEAP8[a + 4] = c;
  HEAP8[a] = c;
  HEAP8[a + 13] = d;
  HEAP8[a + 9] = d;
  HEAP8[a + 5] = d;
  HEAP8[a + 1] = d;
  c = HEAP8[b + 2];
  d = HEAP8[b + 3];
  HEAP8[a + 14] = c;
  HEAP8[a + 10] = c;
  HEAP8[a + 6] = c;
  HEAP8[a + 2] = c;
  HEAP8[a + 15] = d;
  HEAP8[a + 11] = d;
  HEAP8[a + 7] = d;
  HEAP8[a + 3] = d
}
_Intra4x4VerticalPrediction.X = 1;
function _Intra4x4HorizontalPrediction(a, b) {
  var c, d;
  c = HEAP8[b];
  d = HEAP8[b + 1];
  HEAP8[a + 3] = c;
  HEAP8[a + 2] = c;
  HEAP8[a + 1] = c;
  HEAP8[a] = c;
  HEAP8[a + 7] = d;
  HEAP8[a + 6] = d;
  HEAP8[a + 5] = d;
  HEAP8[a + 4] = d;
  c = HEAP8[b + 2];
  d = HEAP8[b + 3];
  HEAP8[a + 11] = c;
  HEAP8[a + 10] = c;
  HEAP8[a + 9] = c;
  HEAP8[a + 8] = c;
  HEAP8[a + 15] = d;
  HEAP8[a + 14] = d;
  HEAP8[a + 13] = d;
  HEAP8[a + 12] = d
}
_Intra4x4HorizontalPrediction.X = 1;
function _Intra4x4DcPrediction(a, b, c, d, e) {
  var f, g, h, j, l;
  f = d != 0 ? 1 : 3;
  a:do {
    if(f == 1) {
      if(e == 0) {
        f = 3;
        break a
      }
      f = HEAP8[b];
      h = HEAP8[b + 1];
      j = HEAP8[b + 2];
      l = HEAP8[b + 3];
      g = (f & 255) + (h & 255) + (j & 255) + (l & 255);
      f = HEAP8[c];
      h = HEAP8[c + 1];
      j = HEAP8[c + 2];
      l = HEAP8[c + 3];
      g += (f & 255) + (h & 255) + (j & 255) + (l & 255);
      g = g + 4 >>> 3;
      f = 10;
      break a
    }
  }while(0);
  f == 3 && (f = d != 0 ? 4 : 5, f == 4 ? (f = HEAP8[c], h = HEAP8[c + 1], j = HEAP8[c + 2], l = HEAP8[c + 3], g = (f & 255) + (h & 255) + (j & 255) + (l & 255) + 2 >> 2) : f == 5 && (f = e != 0 ? 6 : 7, f == 6 ? (f = HEAP8[b], h = HEAP8[b + 1], j = HEAP8[b + 2], l = HEAP8[b + 3], g = (f & 255) + (h & 255) + (j & 255) + (l & 255) + 2 >> 2) : f == 7 && (g = 128)));
  b = g & 255;
  HEAP8[a + 15] = b;
  HEAP8[a + 14] = b;
  HEAP8[a + 13] = b;
  HEAP8[a + 12] = b;
  HEAP8[a + 11] = b;
  HEAP8[a + 10] = b;
  HEAP8[a + 9] = b;
  HEAP8[a + 8] = b;
  HEAP8[a + 7] = b;
  HEAP8[a + 6] = b;
  HEAP8[a + 5] = b;
  HEAP8[a + 4] = b;
  HEAP8[a + 3] = b;
  HEAP8[a + 2] = b;
  HEAP8[a + 1] = b;
  HEAP8[a] = b
}
_Intra4x4DcPrediction.X = 1;
function _Intra4x4DiagonalDownLeftPrediction(a, b) {
  HEAP8[a] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 1] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 4] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 2] = HEAPU8[b + 2] + (HEAPU8[b + 3] << 1) + HEAPU8[b + 4] + 2 >> 2 & 255;
  HEAP8[a + 5] = HEAPU8[b + 2] + (HEAPU8[b + 3] << 1) + HEAPU8[b + 4] + 2 >> 2 & 255;
  HEAP8[a + 8] = HEAPU8[b + 2] + (HEAPU8[b + 3] << 1) + HEAPU8[b + 4] + 2 >> 2 & 255;
  HEAP8[a + 3] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 6] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 9] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 12] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 7] = HEAPU8[b + 4] + (HEAPU8[b + 5] << 1) + HEAPU8[b + 6] + 2 >> 2 & 255;
  HEAP8[a + 10] = HEAPU8[b + 4] + (HEAPU8[b + 5] << 1) + HEAPU8[b + 6] + 2 >> 2 & 255;
  HEAP8[a + 13] = HEAPU8[b + 4] + (HEAPU8[b + 5] << 1) + HEAPU8[b + 6] + 2 >> 2 & 255;
  HEAP8[a + 11] = HEAPU8[b + 5] + (HEAPU8[b + 6] << 1) + HEAPU8[b + 7] + 2 >> 2 & 255;
  HEAP8[a + 14] = HEAPU8[b + 5] + (HEAPU8[b + 6] << 1) + HEAPU8[b + 7] + 2 >> 2 & 255;
  HEAP8[a + 15] = HEAPU8[b + 6] + HEAPU8[b + 7] * 3 + 2 >> 2 & 255
}
_Intra4x4DiagonalDownLeftPrediction.X = 1;
function _Intra4x4DiagonalDownRightPrediction(a, b, c) {
  HEAP8[a] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 5] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 10] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 15] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 1] = HEAPU8[b - 1] + (HEAPU8[b] << 1) + HEAPU8[b + 1] + 2 >> 2 & 255;
  HEAP8[a + 6] = HEAPU8[b - 1] + (HEAPU8[b] << 1) + HEAPU8[b + 1] + 2 >> 2 & 255;
  HEAP8[a + 11] = HEAPU8[b - 1] + (HEAPU8[b] << 1) + HEAPU8[b + 1] + 2 >> 2 & 255;
  HEAP8[a + 2] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 7] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 3] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 4] = HEAPU8[c - 1] + (HEAPU8[c] << 1) + HEAPU8[c + 1] + 2 >> 2 & 255;
  HEAP8[a + 9] = HEAPU8[c - 1] + (HEAPU8[c] << 1) + HEAPU8[c + 1] + 2 >> 2 & 255;
  HEAP8[a + 14] = HEAPU8[c - 1] + (HEAPU8[c] << 1) + HEAPU8[c + 1] + 2 >> 2 & 255;
  HEAP8[a + 8] = HEAPU8[c] + (HEAPU8[c + 1] << 1) + HEAPU8[c + 2] + 2 >> 2 & 255;
  HEAP8[a + 13] = HEAPU8[c] + (HEAPU8[c + 1] << 1) + HEAPU8[c + 2] + 2 >> 2 & 255;
  HEAP8[a + 12] = HEAPU8[c + 1] + (HEAPU8[c + 2] << 1) + HEAPU8[c + 3] + 2 >> 2 & 255
}
_Intra4x4DiagonalDownRightPrediction.X = 1;
function _Intra4x4VerticalRightPrediction(a, b, c) {
  HEAP8[a] = HEAPU8[b - 1] + HEAPU8[b] + 1 >> 1 & 255;
  HEAP8[a + 9] = HEAPU8[b - 1] + HEAPU8[b] + 1 >> 1 & 255;
  HEAP8[a + 5] = HEAPU8[b - 1] + (HEAPU8[b] << 1) + HEAPU8[b + 1] + 2 >> 2 & 255;
  HEAP8[a + 14] = HEAPU8[b - 1] + (HEAPU8[b] << 1) + HEAPU8[b + 1] + 2 >> 2 & 255;
  HEAP8[a + 4] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 13] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 1] = HEAPU8[b] + HEAPU8[b + 1] + 1 >> 1 & 255;
  HEAP8[a + 10] = HEAPU8[b] + HEAPU8[b + 1] + 1 >> 1 & 255;
  HEAP8[a + 6] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 15] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 2] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 11] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 7] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 3] = HEAPU8[b + 2] + HEAPU8[b + 3] + 1 >> 1 & 255;
  HEAP8[a + 8] = HEAPU8[c + 1] + (HEAPU8[c] << 1) + HEAPU8[c - 1] + 2 >> 2 & 255;
  HEAP8[a + 12] = HEAPU8[c + 2] + (HEAPU8[c + 1] << 1) + HEAPU8[c] + 2 >> 2 & 255
}
_Intra4x4VerticalRightPrediction.X = 1;
function _Intra4x4HorizontalDownPrediction(a, b, c) {
  HEAP8[a] = HEAPU8[c - 1] + HEAPU8[c] + 1 >> 1 & 255;
  HEAP8[a + 6] = HEAPU8[c - 1] + HEAPU8[c] + 1 >> 1 & 255;
  HEAP8[a + 5] = HEAPU8[c - 1] + (HEAPU8[c] << 1) + HEAPU8[c + 1] + 2 >> 2 & 255;
  HEAP8[a + 11] = HEAPU8[c - 1] + (HEAPU8[c] << 1) + HEAPU8[c + 1] + 2 >> 2 & 255;
  HEAP8[a + 4] = HEAPU8[c] + HEAPU8[c + 1] + 1 >> 1 & 255;
  HEAP8[a + 10] = HEAPU8[c] + HEAPU8[c + 1] + 1 >> 1 & 255;
  HEAP8[a + 9] = HEAPU8[c] + (HEAPU8[c + 1] << 1) + HEAPU8[c + 2] + 2 >> 2 & 255;
  HEAP8[a + 15] = HEAPU8[c] + (HEAPU8[c + 1] << 1) + HEAPU8[c + 2] + 2 >> 2 & 255;
  HEAP8[a + 8] = HEAPU8[c + 1] + HEAPU8[c + 2] + 1 >> 1 & 255;
  HEAP8[a + 14] = HEAPU8[c + 1] + HEAPU8[c + 2] + 1 >> 1 & 255;
  HEAP8[a + 13] = HEAPU8[c + 1] + (HEAPU8[c + 2] << 1) + HEAPU8[c + 3] + 2 >> 2 & 255;
  HEAP8[a + 12] = HEAPU8[c + 2] + HEAPU8[c + 3] + 1 >> 1 & 255;
  HEAP8[a + 1] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 7] = HEAPU8[b] + (HEAPU8[b - 1] << 1) + HEAPU8[c] + 2 >> 2 & 255;
  HEAP8[a + 2] = HEAPU8[b + 1] + (HEAPU8[b] << 1) + HEAPU8[b - 1] + 2 >> 2 & 255;
  HEAP8[a + 3] = HEAPU8[b + 2] + (HEAPU8[b + 1] << 1) + HEAPU8[b] + 2 >> 2 & 255
}
_Intra4x4HorizontalDownPrediction.X = 1;
function _Intra4x4VerticalLeftPrediction(a, b) {
  HEAP8[a] = HEAPU8[b] + HEAPU8[b + 1] + 1 >> 1 & 255;
  HEAP8[a + 1] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 2] = HEAPU8[b + 2] + HEAPU8[b + 3] + 1 >> 1 & 255;
  HEAP8[a + 3] = HEAPU8[b + 3] + HEAPU8[b + 4] + 1 >> 1 & 255;
  HEAP8[a + 4] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 5] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 6] = HEAPU8[b + 2] + (HEAPU8[b + 3] << 1) + HEAPU8[b + 4] + 2 >> 2 & 255;
  HEAP8[a + 7] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 8] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 9] = HEAPU8[b + 2] + HEAPU8[b + 3] + 1 >> 1 & 255;
  HEAP8[a + 10] = HEAPU8[b + 3] + HEAPU8[b + 4] + 1 >> 1 & 255;
  HEAP8[a + 11] = HEAPU8[b + 4] + HEAPU8[b + 5] + 1 >> 1 & 255;
  HEAP8[a + 12] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 13] = HEAPU8[b + 2] + (HEAPU8[b + 3] << 1) + HEAPU8[b + 4] + 2 >> 2 & 255;
  HEAP8[a + 14] = HEAPU8[b + 3] + (HEAPU8[b + 4] << 1) + HEAPU8[b + 5] + 2 >> 2 & 255;
  HEAP8[a + 15] = HEAPU8[b + 4] + (HEAPU8[b + 5] << 1) + HEAPU8[b + 6] + 2 >> 2 & 255
}
_Intra4x4VerticalLeftPrediction.X = 1;
function _Intra4x4HorizontalUpPrediction(a, b) {
  HEAP8[a] = HEAPU8[b] + HEAPU8[b + 1] + 1 >> 1 & 255;
  HEAP8[a + 1] = HEAPU8[b] + (HEAPU8[b + 1] << 1) + HEAPU8[b + 2] + 2 >> 2 & 255;
  HEAP8[a + 2] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 3] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 4] = HEAPU8[b + 1] + HEAPU8[b + 2] + 1 >> 1 & 255;
  HEAP8[a + 5] = HEAPU8[b + 1] + (HEAPU8[b + 2] << 1) + HEAPU8[b + 3] + 2 >> 2 & 255;
  HEAP8[a + 6] = HEAPU8[b + 2] + HEAPU8[b + 3] + 1 >> 1 & 255;
  HEAP8[a + 7] = HEAPU8[b + 2] + HEAPU8[b + 3] * 3 + 2 >> 2 & 255;
  HEAP8[a + 8] = HEAPU8[b + 2] + HEAPU8[b + 3] + 1 >> 1 & 255;
  HEAP8[a + 9] = HEAPU8[b + 2] + HEAPU8[b + 3] * 3 + 2 >> 2 & 255;
  HEAP8[a + 10] = HEAP8[b + 3];
  HEAP8[a + 11] = HEAP8[b + 3];
  HEAP8[a + 12] = HEAP8[b + 3];
  HEAP8[a + 13] = HEAP8[b + 3];
  HEAP8[a + 14] = HEAP8[b + 3];
  HEAP8[a + 15] = HEAP8[b + 3]
}
_Intra4x4HorizontalUpPrediction.X = 1;
function _Write4x4To16x16(a, b, c) {
  a += (HEAP32[_h264bsdBlockY + (c << 2) >> 2] << 4) + HEAP32[_h264bsdBlockX + (c << 2) >> 2];
  c = a;
  HEAP32[c >> 2] = HEAP32[b >> 2];
  b += 4;
  HEAP32[c + 16 >> 2] = HEAP32[b >> 2];
  b += 4;
  HEAP32[c + 32 >> 2] = HEAP32[b >> 2];
  HEAP32[c + 48 >> 2] = HEAP32[b + 4 >> 2]
}
_Write4x4To16x16.X = 1;
function _IntraChromaDcPrediction(a, b, c, d, e) {
  var f, g, h;
  f = d != 0 ? 1 : 3;
  a:do {
    if(f == 1) {
      if(e == 0) {
        f = 3;
        break a
      }
      g = HEAPU8[b] + HEAPU8[b + 1] + HEAPU8[b + 2] + HEAPU8[b + 3] + HEAPU8[c] + HEAPU8[c + 1] + HEAPU8[c + 2] + HEAPU8[c + 3];
      g = g + 4 >>> 3;
      h = HEAPU8[b + 4] + HEAPU8[b + 5] + HEAPU8[b + 6] + HEAPU8[b + 7] + 2 >> 2;
      f = 10;
      break a
    }
  }while(0);
  f == 3 && (f = e != 0 ? 4 : 5, f == 4 ? (g = HEAPU8[b] + HEAPU8[b + 1] + HEAPU8[b + 2] + HEAPU8[b + 3] + 2 >> 2, h = HEAPU8[b + 4] + HEAPU8[b + 5] + HEAPU8[b + 6] + HEAPU8[b + 7] + 2 >> 2) : f == 5 && (f = d != 0 ? 6 : 7, f == 6 ? h = g = HEAPU8[c] + HEAPU8[c + 1] + HEAPU8[c + 2] + HEAPU8[c + 3] + 2 >> 2 : f == 7 && (g = h = 128)));
  f = 4;
  a:for(;;) {
    var j = f;
    f = j - 1;
    if(j == 0) {
      break a
    }
    j = a;
    a = j + 1;
    HEAP8[j] = g & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = g & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = g & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = g & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = h & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = h & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = h & 255;
    j = a;
    a = j + 1;
    HEAP8[j] = h & 255
  }
  f = d != 0 ? 14 : 18;
  f == 14 ? (g = HEAPU8[c + 4] + HEAPU8[c + 5] + HEAPU8[c + 6] + HEAPU8[c + 7] + 2 >> 2, f = e != 0 ? 15 : 16, f == 15 ? (h = HEAPU8[b + 4] + HEAPU8[b + 5] + HEAPU8[b + 6] + HEAPU8[b + 7] + HEAPU8[c + 4] + HEAPU8[c + 5] + HEAPU8[c + 6] + HEAPU8[c + 7], h = h + 4 >>> 3) : f == 16 && (h = g)) : f == 18 && (f = e != 0 ? 19 : 20, f == 19 ? (g = HEAPU8[b] + HEAPU8[b + 1] + HEAPU8[b + 2] + HEAPU8[b + 3] + 2 >> 2, h = HEAPU8[b + 4] + HEAPU8[b + 5] + HEAPU8[b + 6] + HEAPU8[b + 7] + 2 >> 2) : f == 20 && (g = 
  h = 128));
  f = 4;
  a:for(;;) {
    b = f;
    f = b - 1;
    if(b == 0) {
      break a
    }
    b = a;
    a = b + 1;
    HEAP8[b] = g & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = g & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = g & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = g & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = h & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = h & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = h & 255;
    b = a;
    a = b + 1;
    HEAP8[b] = h & 255
  }
}
_IntraChromaDcPrediction.X = 1;
function _IntraChromaHorizontalPrediction(a, b) {
  var c, d, e;
  c = a;
  d = b;
  e = 8;
  a:for(;;) {
    var f = e;
    e = f - 1;
    if(f == 0) {
      break a
    }
    var f = HEAP8[d], g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = HEAP8[d];
    g = c;
    c = g + 1;
    HEAP8[g] = f;
    f = d;
    d = f + 1;
    f = HEAP8[f];
    g = c;
    c = g + 1;
    HEAP8[g] = f
  }
}
_IntraChromaHorizontalPrediction.X = 1;
function _IntraChromaVerticalPrediction(a, b) {
  var c, d, e;
  c = a;
  d = b;
  e = 8;
  a:for(;;) {
    var f = e;
    e = f - 1;
    if(f == 0) {
      break a
    }
    HEAP8[c] = HEAP8[d];
    HEAP8[c + 8] = HEAP8[d];
    HEAP8[c + 16] = HEAP8[d];
    HEAP8[c + 24] = HEAP8[d];
    HEAP8[c + 32] = HEAP8[d];
    HEAP8[c + 40] = HEAP8[d];
    HEAP8[c + 48] = HEAP8[d];
    f = d;
    d = f + 1;
    HEAP8[c + 56] = HEAP8[f];
    c += 1
  }
}
_IntraChromaVerticalPrediction.X = 1;
function _IntraChromaPlanePrediction(a, b, c) {
  var d, e, f, g;
  g = _h264bsdClip + 512;
  d = HEAPU8[b + 7] + HEAPU8[c + 7] << 4;
  e = HEAPU8[b + 4] - HEAPU8[b + 2] + (HEAPU8[b + 5] - HEAPU8[b + 1] << 1) + (HEAPU8[b + 6] - HEAPU8[b]) * 3 + (HEAPU8[b + 7] - HEAPU8[b - 1] << 2);
  e = e * 17 + 16 >> 5;
  c = HEAPU8[c + 4] - HEAPU8[c + 2] + (HEAPU8[c + 5] - HEAPU8[c + 1] << 1) + (HEAPU8[c + 6] - HEAPU8[c]) * 3 + (HEAPU8[c + 7] - HEAPU8[b - 1] << 2);
  c = c * 17 + 16 >> 5;
  d = d - c * 3 + 16;
  b = 8;
  a:for(;;) {
    f = b;
    b = f - 1;
    if(f == 0) {
      break a
    }
    f = d - e * 3;
    var h = HEAP8[g + (f >> 5)], j = a, a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    h = HEAP8[g + (f >> 5)];
    j = a;
    a = j + 1;
    HEAP8[j] = h;
    f += e;
    f = HEAP8[g + (f >> 5)];
    h = a;
    a = h + 1;
    HEAP8[h] = f;
    d += c
  }
}
_IntraChromaPlanePrediction.X = 1;
function _h264bsdInterPrediction(a, b, c, d, e, f) {
  var g = STACKTOP;
  STACKTOP += 24;
  var h, j, l, k, m, n;
  m = Math.floor(d / HEAPU32[e + 4 >> 2]);
  n = d - m * HEAP32[e + 4 >> 2];
  m <<= 4;
  n <<= 4;
  HEAP32[g + 4 >> 2] = HEAP32[e + 4 >> 2];
  HEAP32[g + 8 >> 2] = HEAP32[e + 8 >> 2];
  h = HEAP32[a >> 2];
  h = h == 0 ? 1 : h == 1 ? 1 : h == 2 ? 4 : h == 3 ? 7 : 10;
  a:do {
    if(h == 10) {
      h = _MvPrediction8x8(a, b + 176, c) != 0 ? 11 : 12;
      do {
        if(h == 11) {
          j = 1;
          h = 28;
          break a
        }else {
          if(h == 12) {
            c = 0;
            c:for(;;) {
              if(!(c < 4)) {
                break c
              }
              HEAP32[g >> 2] = HEAP32[a + 116 + (c << 2) >> 2];
              h = _h264bsdSubMbPartMode(HEAP32[b + 176 + (c << 2) >> 2]);
              l = (c & 1) != 0 ? 8 : 0;
              k = c < 2 ? 0 : 8;
              h = h == 0 ? 15 : h == 1 ? 16 : h == 2 ? 17 : 18;
              h == 18 ? (_h264bsdPredictSamples(f, a + 132 + (c << 2 << 2), g, n, m, l, k, 4, 4), _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2) + 4, g, n, m, l + 4, k, 4, 4), _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2) + 8, g, n, m, l, k + 4, 4, 4), _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2) + 12, g, n, m, l + 4, k + 4, 4, 4)) : h == 15 ? _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2), g, n, m, l, k, 8, 8) : h == 16 ? (_h264bsdPredictSamples(f, a + 132 + (c << 2 << 2), g, n, m, 
              l, k, 8, 4), _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2) + 8, g, n, m, l, k + 4, 8, 4)) : h == 17 && (_h264bsdPredictSamples(f, a + 132 + (c << 2 << 2), g, n, m, l, k, 4, 8), _h264bsdPredictSamples(f, a + 132 + (c << 2 << 2) + 4, g, n, m, l + 4, k, 4, 8));
              c += 1
            }
            h = 22;
            break a
          }
        }
      }while(0)
    }else {
      if(h == 1) {
        h = _MvPrediction16x16(a, b + 12, c) != 0 ? 2 : 3;
        do {
          if(h == 2) {
            j = 1;
            h = 28;
            break a
          }else {
            if(h == 3) {
              HEAP32[g >> 2] = HEAP32[a + 116 >> 2];
              _h264bsdPredictSamples(f, a + 132, g, n, m, 0, 0, 16, 16);
              h = 22;
              break a
            }
          }
        }while(0)
      }else {
        if(h == 4) {
          h = _MvPrediction16x8(a, b + 12, c) != 0 ? 5 : 6;
          do {
            if(h == 5) {
              j = 1;
              h = 28;
              break a
            }else {
              if(h == 6) {
                HEAP32[g >> 2] = HEAP32[a + 116 >> 2];
                _h264bsdPredictSamples(f, a + 132, g, n, m, 0, 0, 16, 8);
                HEAP32[g >> 2] = HEAP32[a + 124 >> 2];
                _h264bsdPredictSamples(f, a + 164, g, n, m, 0, 8, 16, 8);
                h = 22;
                break a
              }
            }
          }while(0)
        }else {
          if(h == 7) {
            h = _MvPrediction8x16(a, b + 12, c) != 0 ? 8 : 9;
            do {
              if(h == 8) {
                j = 1;
                h = 28;
                break a
              }else {
                if(h == 9) {
                  HEAP32[g >> 2] = HEAP32[a + 116 >> 2];
                  _h264bsdPredictSamples(f, a + 132, g, n, m, 0, 0, 8, 16);
                  HEAP32[g >> 2] = HEAP32[a + 120 >> 2];
                  _h264bsdPredictSamples(f, a + 148, g, n, m, 8, 0, 8, 16);
                  h = 22;
                  break a
                }
              }
            }while(0)
          }
        }
      }
    }
  }while(0);
  h == 22 && (h = HEAPU32[a + 196 >> 2] > 1 ? 23 : 24, h == 23 ? j = 0 : h == 24 && (h = HEAP32[a >> 2] != 0 ? 25 : 26, h == 25 ? _h264bsdWriteOutputBlocks(e, d, f, b + 328) : h == 26 && _h264bsdWriteMacroblock(e, f), j = 0));
  STACKTOP = g;
  return j
}
_h264bsdInterPrediction.X = 1;
function _MvPrediction16x16(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 44;
  var e, f, g = d + 4, h = d + 8, j, l, k;
  j = HEAP32[b + 132 >> 2];
  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 200 >> 2], h, 5);
  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 12, 10);
  l = h + 8;
  k = h + 20;
  e = HEAP32[a >> 2] == 0 ? 1 : 8;
  a:do {
    if(e == 1) {
      e = HEAP32[h >> 2] != 0 ? 2 : 7;
      b:do {
        if(e == 2) {
          if(HEAP32[h + 12 >> 2] == 0) {
            break b
          }
          e = HEAP32[h + 4 >> 2] == 0 ? 4 : 5;
          do {
            if(e == 4 && HEAP32[l >> 2] == 0) {
              break b
            }
          }while(0);
          if(HEAP32[h + 16 >> 2] != 0) {
            e = 8;
            break a
          }
          if(HEAP32[k >> 2] != 0) {
            e = 8;
            break a
          }
        }
      }while(0);
      HEAP16[d + 2 >> 1] = 0;
      HEAP16[d >> 1] = 0;
      e = 15;
      break a
    }
  }while(0);
  a:do {
    if(e == 8) {
      l = d;
      e = b + 148;
      for(k = e + 4;e < k;) {
        HEAP8[l++] = HEAP8[e++]
      }
      _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 208 >> 2], h + 24, 10);
      e = HEAP32[h + 24 >> 2] != 0 ? 10 : 9;
      e == 9 && _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 212 >> 2], h + 24, 15);
      _GetPredictionMv(g, h, j);
      HEAP16[d >> 1] = HEAP16[d >> 1] + HEAP16[g >> 1] & 65535;
      HEAP16[d + 2 >> 1] = HEAP16[d + 2 >> 1] + HEAP16[g + 2 >> 1] & 65535;
      e = HEAP16[d >> 1] + 8192 >= 16384 ? 11 : 12;
      do {
        if(e == 11) {
          f = 1;
          e = 18;
          break a
        }else {
          if(e == 12) {
            e = HEAP16[d + 2 >> 1] + 2048 >= 4096 ? 13 : 14;
            do {
              if(e == 13) {
                f = 1;
                e = 18;
                break a
              }else {
                if(e == 14) {
                  e = 15;
                  break a
                }
              }
            }while(0)
          }
        }
      }while(0)
    }
  }while(0);
  if(e == 15) {
    if(b = _h264bsdGetRefPicData(c, j), e = b == 0 ? 16 : 17, e == 16) {
      f = 1
    }else {
      if(e == 17) {
        e = d;
        l = a + 192;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 192;
        l = a + 188;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 188;
        l = a + 184;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 184;
        l = a + 180;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 180;
        l = a + 176;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 176;
        l = a + 172;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 172;
        l = a + 168;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 168;
        l = a + 164;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 164;
        l = a + 160;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 160;
        l = a + 156;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 156;
        l = a + 152;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 152;
        l = a + 148;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 148;
        l = a + 144;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 144;
        l = a + 140;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 140;
        l = a + 136;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        e = a + 136;
        l = a + 132;
        for(k = e + 4;e < k;) {
          HEAP8[l++] = HEAP8[e++]
        }
        HEAP32[a + 100 >> 2] = j;
        HEAP32[a + 104 >> 2] = j;
        HEAP32[a + 108 >> 2] = j;
        HEAP32[a + 112 >> 2] = j;
        HEAP32[a + 116 >> 2] = b;
        HEAP32[a + 120 >> 2] = b;
        HEAP32[a + 124 >> 2] = b;
        HEAP32[a + 128 >> 2] = b;
        f = 0
      }
    }
  }
  STACKTOP = d;
  return f
}
_MvPrediction16x16.X = 1;
function _MvPrediction16x8(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 44;
  var e, f, g = d + 4, h = d + 8, j, l, k, m;
  e = b + 148;
  k = d;
  for(m = e + 4;e < m;) {
    HEAP8[k++] = HEAP8[e++]
  }
  j = HEAP32[b + 132 >> 2];
  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 12, 10);
  e = HEAP32[h + 16 >> 2] == j ? 1 : 2;
  if(e == 1) {
    e = h + 20;
    k = g;
    for(m = e + 4;e < m;) {
      HEAP8[k++] = HEAP8[e++]
    }
  }else {
    e == 2 && (_GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 200 >> 2], h, 5), _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 208 >> 2], h + 24, 10), e = HEAP32[h + 24 >> 2] != 0 ? 4 : 3, e == 3 && _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 212 >> 2], h + 24, 15), _GetPredictionMv(g, h, j))
  }
  HEAP16[d >> 1] = HEAP16[d >> 1] + HEAP16[g >> 1] & 65535;
  HEAP16[d + 2 >> 1] = HEAP16[d + 2 >> 1] + HEAP16[g + 2 >> 1] & 65535;
  e = HEAP16[d >> 1] + 8192 >= 16384 ? 6 : 7;
  if(e == 6) {
    f = 1
  }else {
    if(e == 7) {
      if(e = HEAP16[d + 2 >> 1] + 2048 >= 4096 ? 8 : 9, e == 8) {
        f = 1
      }else {
        if(e == 9) {
          if(l = _h264bsdGetRefPicData(c, j), e = l == 0 ? 10 : 11, e == 10) {
            f = 1
          }else {
            if(e == 11) {
              e = d;
              k = a + 160;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 160;
              k = a + 156;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 156;
              k = a + 152;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 152;
              k = a + 148;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 148;
              k = a + 144;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 144;
              k = a + 140;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 140;
              k = a + 136;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 136;
              k = a + 132;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              HEAP32[a + 100 >> 2] = j;
              HEAP32[a + 104 >> 2] = j;
              HEAP32[a + 116 >> 2] = l;
              HEAP32[a + 120 >> 2] = l;
              e = b + 152;
              k = d;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              j = HEAP32[b + 136 >> 2];
              _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 200 >> 2], h, 13);
              e = HEAP32[h + 4 >> 2] == j ? 12 : 13;
              if(e == 12) {
                e = h + 8;
                k = g;
                for(m = e + 4;e < m;) {
                  HEAP8[k++] = HEAP8[e++]
                }
              }else {
                if(e == 13) {
                  HEAP32[h + 12 >> 2] = 1;
                  HEAP32[h + 16 >> 2] = HEAP32[a + 100 >> 2];
                  e = a + 132;
                  k = h + 20;
                  for(m = e + 4;e < m;) {
                    HEAP8[k++] = HEAP8[e++]
                  }
                  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 200 >> 2], h + 24, 7);
                  _GetPredictionMv(g, h, j)
                }
              }
              HEAP16[d >> 1] = HEAP16[d >> 1] + HEAP16[g >> 1] & 65535;
              HEAP16[d + 2 >> 1] = HEAP16[d + 2 >> 1] + HEAP16[g + 2 >> 1] & 65535;
              e = HEAP16[d >> 1] + 8192 >= 16384 ? 15 : 16;
              if(e == 15) {
                f = 1
              }else {
                if(e == 16) {
                  if(e = HEAP16[d + 2 >> 1] + 2048 >= 4096 ? 17 : 18, e == 17) {
                    f = 1
                  }else {
                    if(e == 18) {
                      if(l = _h264bsdGetRefPicData(c, j), e = l == 0 ? 19 : 20, e == 19) {
                        f = 1
                      }else {
                        if(e == 20) {
                          e = d;
                          k = a + 192;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 192;
                          k = a + 188;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 188;
                          k = a + 184;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 184;
                          k = a + 180;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 180;
                          k = a + 176;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 176;
                          k = a + 172;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 172;
                          k = a + 168;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 168;
                          k = a + 164;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          HEAP32[a + 108 >> 2] = j;
                          HEAP32[a + 112 >> 2] = j;
                          HEAP32[a + 124 >> 2] = l;
                          HEAP32[a + 128 >> 2] = l;
                          f = 0
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  STACKTOP = d;
  return f
}
_MvPrediction16x8.X = 1;
function _MvPrediction8x16(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 44;
  var e, f, g = d + 4, h = d + 8, j, l, k, m;
  e = b + 148;
  k = d;
  for(m = e + 4;e < m;) {
    HEAP8[k++] = HEAP8[e++]
  }
  j = HEAP32[b + 132 >> 2];
  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 200 >> 2], h, 5);
  e = HEAP32[h + 4 >> 2] == j ? 1 : 2;
  if(e == 1) {
    e = h + 8;
    k = g;
    for(m = e + 4;e < m;) {
      HEAP8[k++] = HEAP8[e++]
    }
  }else {
    e == 2 && (_GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 12, 10), _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 24, 14), e = HEAP32[h + 24 >> 2] != 0 ? 4 : 3, e == 3 && _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 212 >> 2], h + 24, 15), _GetPredictionMv(g, h, j))
  }
  HEAP16[d >> 1] = HEAP16[d >> 1] + HEAP16[g >> 1] & 65535;
  HEAP16[d + 2 >> 1] = HEAP16[d + 2 >> 1] + HEAP16[g + 2 >> 1] & 65535;
  e = HEAP16[d >> 1] + 8192 >= 16384 ? 6 : 7;
  if(e == 6) {
    f = 1
  }else {
    if(e == 7) {
      if(e = HEAP16[d + 2 >> 1] + 2048 >= 4096 ? 8 : 9, e == 8) {
        f = 1
      }else {
        if(e == 9) {
          if(l = _h264bsdGetRefPicData(c, j), e = l == 0 ? 10 : 11, e == 10) {
            f = 1
          }else {
            if(e == 11) {
              e = d;
              k = a + 176;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 176;
              k = a + 172;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 172;
              k = a + 168;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 168;
              k = a + 164;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 164;
              k = a + 144;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 144;
              k = a + 140;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 140;
              k = a + 136;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              e = a + 136;
              k = a + 132;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              HEAP32[a + 100 >> 2] = j;
              HEAP32[a + 108 >> 2] = j;
              HEAP32[a + 116 >> 2] = l;
              HEAP32[a + 124 >> 2] = l;
              e = b + 152;
              k = d;
              for(m = e + 4;e < m;) {
                HEAP8[k++] = HEAP8[e++]
              }
              j = HEAP32[b + 136 >> 2];
              _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 208 >> 2], h + 24, 10);
              e = HEAP32[h + 24 >> 2] != 0 ? 13 : 12;
              e == 12 && _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 24, 11);
              e = HEAP32[h + 28 >> 2] == j ? 14 : 15;
              if(e == 14) {
                e = h + 32;
                k = g;
                for(m = e + 4;e < m;) {
                  HEAP8[k++] = HEAP8[e++]
                }
              }else {
                if(e == 15) {
                  HEAP32[h >> 2] = 1;
                  HEAP32[h + 4 >> 2] = HEAP32[a + 100 >> 2];
                  e = a + 132;
                  k = h + 8;
                  for(m = e + 4;e < m;) {
                    HEAP8[k++] = HEAP8[e++]
                  }
                  _GetInterNeighbour(HEAP32[a + 4 >> 2], HEAP32[a + 204 >> 2], h + 12, 14);
                  _GetPredictionMv(g, h, j)
                }
              }
              HEAP16[d >> 1] = HEAP16[d >> 1] + HEAP16[g >> 1] & 65535;
              HEAP16[d + 2 >> 1] = HEAP16[d + 2 >> 1] + HEAP16[g + 2 >> 1] & 65535;
              e = HEAP16[d >> 1] + 8192 >= 16384 ? 17 : 18;
              if(e == 17) {
                f = 1
              }else {
                if(e == 18) {
                  if(e = HEAP16[d + 2 >> 1] + 2048 >= 4096 ? 19 : 20, e == 19) {
                    f = 1
                  }else {
                    if(e == 20) {
                      if(l = _h264bsdGetRefPicData(c, j), e = l == 0 ? 21 : 22, e == 21) {
                        f = 1
                      }else {
                        if(e == 22) {
                          e = d;
                          k = a + 192;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 192;
                          k = a + 188;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 188;
                          k = a + 184;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 184;
                          k = a + 180;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 180;
                          k = a + 160;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 160;
                          k = a + 156;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 156;
                          k = a + 152;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          e = a + 152;
                          k = a + 148;
                          for(m = e + 4;e < m;) {
                            HEAP8[k++] = HEAP8[e++]
                          }
                          HEAP32[a + 104 >> 2] = j;
                          HEAP32[a + 112 >> 2] = j;
                          HEAP32[a + 120 >> 2] = l;
                          HEAP32[a + 128 >> 2] = l;
                          f = 0
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  STACKTOP = d;
  return f
}
_MvPrediction8x16.X = 1;
function _MvPrediction8x8(a, b, c) {
  var d, e, f, g, h;
  f = 0;
  a:for(;;) {
    if(!(f < 4)) {
      d = 12;
      break a
    }
    h = _h264bsdNumSubMbPart(HEAP32[b + (f << 2) >> 2]);
    HEAP32[a + 100 + (f << 2) >> 2] = HEAP32[b + 16 + (f << 2) >> 2];
    g = _h264bsdGetRefPicData(c, HEAP32[b + 16 + (f << 2) >> 2]);
    HEAP32[a + 116 + (f << 2) >> 2] = g;
    if(HEAP32[a + 116 + (f << 2) >> 2] == 0) {
      d = 3;
      break a
    }
    g = 0;
    b:for(;;) {
      if(!(g < h)) {
        d = 10;
        break b
      }
      if(_MvPrediction(a, b, f, g) != 0) {
        d = 7;
        break a
      }
      g += 1
    }
    f += 1
  }
  d == 12 ? e = 0 : d == 3 ? e = 1 : d == 7 && (e = 1);
  return e
}
_MvPrediction8x8.X = 1;
function _MedianFilter(a, b, c) {
  var d, e, f;
  d = e = f = a;
  a = b > d ? 1 : 2;
  a == 1 ? d = b : a == 2 && (b < e ? 3 : 4) == 3 && (e = b);
  a = c > d ? 6 : 7;
  a == 6 ? f = d : a == 7 && (a = c < e ? 8 : 9, a == 8 ? f = e : a == 9 && (f = c));
  return f
}
function _GetInterNeighbour(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 4;
  var f, g;
  HEAP32[c >> 2] = 0;
  HEAP32[c + 4 >> 2] = -1;
  HEAP16[c + 10 >> 1] = 0;
  HEAP16[c + 8 >> 1] = 0;
  f = b != 0 ? 1 : 5;
  a:do {
    if(f == 1) {
      if(a != HEAP32[b + 4 >> 2]) {
        break a
      }
      g = HEAP32[b >> 2];
      HEAP32[c >> 2] = 1;
      f = g <= 5 ? 3 : 4;
      if(f == 3) {
        var h = e, j;
        g = b + 132 + (d << 2);
        for(j = g + 4;g < j;) {
          HEAP8[h++] = HEAP8[g++]
        }
        g = HEAP32[b + 100 + (d >>> 2 << 2) >> 2];
        HEAP32[c + 4 >> 2] = g;
        g = e;
        h = c + 8;
        for(j = g + 4;g < j;) {
          HEAP8[h++] = HEAP8[g++]
        }
      }
    }
  }while(0);
  STACKTOP = e
}
_GetInterNeighbour.X = 1;
function _h264bsdInterpolateChromaHor(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 144;
  var k, m, n, q, p, o, r, s, t, u;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(h + (c + 1) > e) {
        k = 4;
        break a
      }
      if(d < 0) {
        k = 4;
        break a
      }
      k = d + j > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, d, e, f, h + 1, j, h + 1), a += e * f, _h264bsdFillBlock(a, l + (h + 1) * j, c, d, e, f, h + 1, j, h + 1), a = l, d = c = 0, e = h + 1, f = j);
  r = 8 - g;
  u = 0;
  a:for(;;) {
    if(!(u <= 1)) {
      break a
    }
    s = a + (u * f + d) * e + c;
    t = b + (u << 3 << 3);
    m = j >>> 1;
    b:for(;;) {
      if(m == 0) {
        break b
      }
      k = h >>> 1;
      c:for(;;) {
        if(k == 0) {
          break c
        }
        n = HEAPU8[s + e];
        p = s;
        s = p + 1;
        q = HEAPU8[p];
        p = HEAPU8[s + e];
        o = s;
        s = o + 1;
        o = HEAPU8[o];
        n = (r * n + g * p << 3) + 32;
        n >>>= 6;
        HEAP8[t + 8] = n & 255;
        n = (r * q + g * o << 3) + 32;
        n >>>= 6;
        q = t;
        t = q + 1;
        HEAP8[q] = n & 255;
        n = HEAPU8[s + e];
        q = HEAPU8[s];
        n = (r * p + g * n << 3) + 32;
        n >>>= 6;
        HEAP8[t + 8] = n & 255;
        n = (r * o + g * q << 3) + 32;
        n >>>= 6;
        p = t;
        t = p + 1;
        HEAP8[p] = n & 255;
        k -= 1
      }
      t += 16 - h;
      s += (e << 1) - h;
      m -= 1
    }
    u += 1
  }
  STACKTOP = l
}
_h264bsdInterpolateChromaHor.X = 1;
function _MvPrediction(a, b, c, d) {
  var e = STACKTOP;
  STACKTOP += 44;
  var f, g, h = e + 4, j, l, k = e + 8;
  j = b + 32 + (c << 4) + (d << 2);
  f = e;
  for(l = j + 4;j < l;) {
    HEAP8[f++] = HEAP8[j++]
  }
  j = _h264bsdSubMbPartMode(HEAP32[b + (c << 2) >> 2]);
  b = HEAP32[b + 16 + (c << 2) >> 2];
  f = _N_A_SUB_PART + (c << 7) + (j << 5) + (d << 3);
  l = _h264bsdGetNeighbourMb(a, HEAP32[f >> 2]);
  _GetInterNeighbour(HEAP32[a + 4 >> 2], l, k, HEAPU8[f + 4]);
  f = _N_B_SUB_PART + (c << 7) + (j << 5) + (d << 3);
  l = _h264bsdGetNeighbourMb(a, HEAP32[f >> 2]);
  _GetInterNeighbour(HEAP32[a + 4 >> 2], l, k + 12, HEAPU8[f + 4]);
  f = _N_C_SUB_PART + (c << 7) + (j << 5) + (d << 3);
  l = _h264bsdGetNeighbourMb(a, HEAP32[f >> 2]);
  _GetInterNeighbour(HEAP32[a + 4 >> 2], l, k + 24, HEAPU8[f + 4]);
  f = HEAP32[k + 24 >> 2] != 0 ? 2 : 1;
  f == 1 && (f = _N_D_SUB_PART + (c << 7) + (j << 5) + (d << 3), l = _h264bsdGetNeighbourMb(a, HEAP32[f >> 2]), _GetInterNeighbour(HEAP32[a + 4 >> 2], l, k + 24, HEAPU8[f + 4]));
  _GetPredictionMv(h, k, b);
  HEAP16[e >> 1] = HEAP16[e >> 1] + HEAP16[h >> 1] & 65535;
  HEAP16[e + 2 >> 1] = HEAP16[e + 2 >> 1] + HEAP16[h + 2 >> 1] & 65535;
  f = HEAP16[e >> 1] + 8192 >= 16384 ? 3 : 4;
  if(f == 3) {
    g = 1
  }else {
    if(f == 4) {
      if(f = HEAP16[e + 2 >> 1] + 2048 >= 4096 ? 5 : 6, f == 5) {
        g = 1
      }else {
        if(f == 6) {
          f = j == 0 ? 7 : j == 1 ? 8 : j == 2 ? 9 : j == 3 ? 10 : 11;
          if(f == 7) {
            j = e;
            f = a + 132 + (c << 2 << 2);
            for(l = j + 4;j < l;) {
              HEAP8[f++] = HEAP8[j++]
            }
            j = e;
            f = a + 132 + ((c << 2) + 1 << 2);
            for(l = j + 4;j < l;) {
              HEAP8[f++] = HEAP8[j++]
            }
            j = e;
            f = a + 132 + ((c << 2) + 2 << 2);
            for(l = j + 4;j < l;) {
              HEAP8[f++] = HEAP8[j++]
            }
            j = e;
            f = a + 132 + ((c << 2) + 3 << 2);
            for(l = j + 4;j < l;) {
              HEAP8[f++] = HEAP8[j++]
            }
          }else {
            if(f == 8) {
              j = e;
              f = a + 132 + ((c << 2) + (d << 1) << 2);
              for(l = j + 4;j < l;) {
                HEAP8[f++] = HEAP8[j++]
              }
              j = e;
              f = a + 132 + ((c << 2) + (d << 1) + 1 << 2);
              for(l = j + 4;j < l;) {
                HEAP8[f++] = HEAP8[j++]
              }
            }else {
              if(f == 9) {
                j = e;
                f = a + 132 + ((c << 2) + d << 2);
                for(l = j + 4;j < l;) {
                  HEAP8[f++] = HEAP8[j++]
                }
                j = e;
                f = a + 132 + ((c << 2) + d + 2 << 2);
                for(l = j + 4;j < l;) {
                  HEAP8[f++] = HEAP8[j++]
                }
              }else {
                if(f == 10) {
                  j = e;
                  f = a + 132 + ((c << 2) + d << 2);
                  for(l = j + 4;j < l;) {
                    HEAP8[f++] = HEAP8[j++]
                  }
                }
              }
            }
          }
          g = 0
        }
      }
    }
  }
  STACKTOP = e;
  return g
}
_MvPrediction.X = 1;
function _GetPredictionMv(a, b, c) {
  var d, e, f;
  d = HEAP32[b + 12 >> 2] != 0 ? 3 : 1;
  a:do {
    if(d == 1) {
      if(HEAP32[b + 24 >> 2] != 0) {
        d = 3;
        break a
      }
      if(HEAP32[b >> 2] == 0) {
        d = 3;
        break a
      }
      e = b + 8;
      f = a;
      for(d = e + 4;e < d;) {
        HEAP8[f++] = HEAP8[e++]
      }
      d = 14;
      break a
    }
  }while(0);
  if(d == 3) {
    if(e = HEAP32[b + 4 >> 2] == c ? 1 : 0, f = HEAP32[b + 16 >> 2] == c ? 1 : 0, c = HEAP32[b + 28 >> 2] == c ? 1 : 0, d = e + f + c != 1 ? 4 : 5, d == 4) {
      c = _MedianFilter(HEAP16[b + 8 >> 1], HEAP16[b + 20 >> 1], HEAP16[b + 32 >> 1]) & 65535, HEAP16[a >> 1] = c, b = _MedianFilter(HEAP16[b + 10 >> 1], HEAP16[b + 22 >> 1], HEAP16[b + 34 >> 1]) & 65535, HEAP16[a + 2 >> 1] = b
    }else {
      if(d == 5) {
        if(d = e != 0 ? 6 : 7, d == 6) {
          e = b + 8;
          f = a;
          for(d = e + 4;e < d;) {
            HEAP8[f++] = HEAP8[e++]
          }
        }else {
          if(d == 7) {
            if(d = f != 0 ? 8 : 9, d == 8) {
              e = b + 20;
              f = a;
              for(d = e + 4;e < d;) {
                HEAP8[f++] = HEAP8[e++]
              }
            }else {
              if(d == 9) {
                e = b + 32;
                f = a;
                for(d = e + 4;e < d;) {
                  HEAP8[f++] = HEAP8[e++]
                }
              }
            }
          }
        }
      }
    }
  }
}
_GetPredictionMv.X = 1;
function _h264bsdFillBlock(a, b, c, d, e, f, g, h, j) {
  var l, k, m, n, q, p, o;
  l = c;
  k = d;
  m = l + g;
  d = l >= 0 ? 1 : 3;
  a:do {
    if(d == 1) {
      if(!(m <= e)) {
        d = 3;
        break a
      }
      n = 2;
      d = 4;
      break a
    }
  }while(0);
  d == 3 && (n = 4);
  (k + h < 0 ? 5 : 6) == 5 && (k = -h);
  (m < 0 ? 7 : 8) == 7 && (l = -g);
  (k > f ? 9 : 10) == 9 && (k = f);
  (l > e ? 11 : 12) == 11 && (l = e);
  m = l + g;
  c = k + h;
  (l > 0 ? 13 : 14) == 13 && (a += l);
  (k > 0 ? 15 : 16) == 15 && (a += k * e);
  d = l < 0 ? 17 : 18;
  d == 17 ? q = -l : d == 18 && (q = 0);
  d = m > e ? 20 : 21;
  d == 20 ? p = m - e : d == 21 && (p = 0);
  g = g - q - p;
  d = k < 0 ? 23 : 24;
  d == 23 ? o = -k : d == 24 && (o = 0);
  d = c > f ? 26 : 27;
  if(d == 26) {
    var r = c - f
  }else {
    d == 27 && (r = 0)
  }
  f = r;
  h = h - o - f;
  a:for(;;) {
    if(o == 0) {
      break a
    }
    FUNCTION_TABLE[n](a, b, q, g, p);
    b += j;
    o -= 1
  }
  a:for(;;) {
    if(h == 0) {
      break a
    }
    FUNCTION_TABLE[n](a, b, q, g, p);
    a += e;
    b += j;
    h -= 1
  }
  a += -e;
  a:for(;;) {
    if(f == 0) {
      break a
    }
    FUNCTION_TABLE[n](a, b, q, g, p);
    b += j;
    f -= 1
  }
}
_h264bsdFillBlock.X = 1;
function _h264bsdInterpolateChromaVer(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 144;
  var k, m, n, q, p, o, r, s, t;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(c + h > e) {
        k = 4;
        break a
      }
      if(d < 0) {
        k = 4;
        break a
      }
      k = j + (d + 1) > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, d, e, f, h, j + 1, h), a += e * f, _h264bsdFillBlock(a, l + h * (j + 1), c, d, e, f, h, j + 1, h), a = l, d = c = 0, e = h, f = j + 1);
  o = 8 - g;
  t = 0;
  a:for(;;) {
    if(!(t <= 1)) {
      break a
    }
    r = a + (t * f + d) * e + c;
    s = b + (t << 3 << 3);
    m = j >>> 1;
    b:for(;;) {
      if(m == 0) {
        break b
      }
      k = h >>> 1;
      c:for(;;) {
        if(k == 0) {
          break c
        }
        p = HEAPU8[r + (e << 1)];
        q = HEAPU8[r + e];
        n = r;
        r = n + 1;
        n = HEAPU8[n];
        p = (o * q + g * p << 3) + 32;
        p >>>= 6;
        HEAP8[s + 8] = p & 255;
        p = (o * n + g * q << 3) + 32;
        p >>>= 6;
        q = s;
        s = q + 1;
        HEAP8[q] = p & 255;
        p = HEAPU8[r + (e << 1)];
        q = HEAPU8[r + e];
        n = r;
        r = n + 1;
        n = HEAPU8[n];
        p = (o * q + g * p << 3) + 32;
        p >>>= 6;
        HEAP8[s + 8] = p & 255;
        p = (o * n + g * q << 3) + 32;
        p >>>= 6;
        q = s;
        s = q + 1;
        HEAP8[q] = p & 255;
        k -= 1
      }
      s += 16 - h;
      r += (e << 1) - h;
      m -= 1
    }
    t += 1
  }
  STACKTOP = l
}
_h264bsdInterpolateChromaVer.X = 1;
function _h264bsdInterpolateChromaHorVer(a, b, c, d, e, f, g, h, j, l) {
  var k = STACKTOP;
  STACKTOP += 164;
  var m, n, q, p, o, r, s, t, u, v, w, x;
  m = c < 0 ? 4 : 1;
  a:do {
    if(m == 1) {
      if(j + (c + 1) > e) {
        m = 4;
        break a
      }
      if(d < 0) {
        m = 4;
        break a
      }
      m = l + (d + 1) > f ? 4 : 5;
      break a
    }
  }while(0);
  m == 4 && (_h264bsdFillBlock(a, k, c, d, e, f, j + 1, l + 1, j + 1), a += e * f, _h264bsdFillBlock(a, k + (j + 1) * (l + 1), c, d, e, f, j + 1, l + 1, j + 1), a = k, d = c = 0, e = j + 1, f = l + 1);
  t = 8 - g;
  u = 8 - h;
  v = 0;
  a:for(;;) {
    if(!(v <= 1)) {
      break a
    }
    w = a + (v * f + d) * e + c;
    x = b + (v << 3 << 3);
    n = l >>> 1;
    b:for(;;) {
      if(n == 0) {
        break b
      }
      q = HEAPU8[w];
      o = HEAPU8[w + e];
      s = HEAPU8[w + (e << 1)];
      q *= u;
      q += o * h;
      o *= u;
      o += s * h;
      m = j >>> 1;
      c:for(;;) {
        if(m == 0) {
          break c
        }
        w = p = w + 1;
        p = HEAPU8[p];
        r = HEAPU8[w + e];
        s = HEAPU8[w + (e << 1)];
        p *= u;
        p += r * h;
        r *= u;
        r += s * h;
        q = q * t + 32;
        o = o * t + 32;
        q += p * g;
        q >>>= 6;
        o += r * g;
        o >>>= 6;
        HEAP8[x + 8] = o & 255;
        o = x;
        x = o + 1;
        HEAP8[o] = q & 255;
        w = q = w + 1;
        q = HEAPU8[q];
        o = HEAPU8[w + e];
        s = HEAPU8[w + (e << 1)];
        q *= u;
        q += o * h;
        o *= u;
        o += s * h;
        p = p * t + 32;
        r = r * t + 32;
        p += q * g;
        p >>>= 6;
        r += o * g;
        r >>>= 6;
        HEAP8[x + 8] = r & 255;
        r = x;
        x = r + 1;
        HEAP8[r] = p & 255;
        m -= 1
      }
      x += 16 - j;
      w += (e << 1) - j;
      n -= 1
    }
    v += 1
  }
  STACKTOP = k
}
_h264bsdInterpolateChromaHorVer.X = 1;
function _h264bsdInterpolateVerHalf(a, b, c, d, e, f, g, h) {
  var j = STACKTOP;
  STACKTOP += 444;
  var l, k, m, n, q, p, o;
  k = d;
  d = _h264bsdClip + 512;
  l = c < 0 ? 4 : 1;
  a:do {
    if(l == 1) {
      if(c + g > e) {
        l = 4;
        break a
      }
      if(k < 0) {
        l = 4;
        break a
      }
      l = h + (k + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  l == 4 && (_h264bsdFillBlock(a, j, c, k, e, f, g, h + 5, g), k = c = 0, a = j, e = g);
  a += k * e + c;
  f = a + e;
  a = f + e * 5;
  h >>>= 2;
  a:for(;;) {
    if(h == 0) {
      break a
    }
    c = g;
    b:for(;;) {
      if(c == 0) {
        break b
      }
      q = HEAPU8[a + (-e << 1)];
      k = HEAPU8[a + -e];
      l = HEAPU8[a + e];
      m = HEAPU8[a + (e << 1)];
      n = a;
      a = n + 1;
      p = HEAPU8[n];
      o = q + l;
      m -= o << 2;
      m -= o;
      m += 16;
      o = k + p;
      n = HEAPU8[f + (e << 1)];
      m += o << 4;
      m += o << 2;
      m += n;
      m = HEAPU8[d + (m >> 5)];
      l += 16;
      HEAP8[b + 48] = m & 255;
      o = n + p;
      l -= o << 2;
      l -= o;
      o = q + k;
      m = HEAPU8[f + e];
      l += o << 4;
      l += o << 2;
      l += m;
      l = HEAPU8[d + (l >> 5)];
      p += 16;
      HEAP8[b + 32] = l & 255;
      o = m + k;
      p -= o << 2;
      p -= o;
      o = q + n;
      l = HEAPU8[f];
      p += o << 4;
      p += o << 2;
      p += l;
      p = HEAPU8[d + (p >> 5)];
      k += 16;
      HEAP8[b + 16] = p & 255;
      l += q;
      k -= l << 2;
      k -= l;
      n += m;
      p = HEAPU8[f + -e];
      k += n << 4;
      k += n << 2;
      k += p;
      k = HEAPU8[d + (k >> 5)];
      l = b;
      b = l + 1;
      HEAP8[l] = k & 255;
      f += 1;
      c -= 1
    }
    f += (e << 2) - g;
    a += (e << 2) - g;
    b += 64 - g;
    h -= 1
  }
  STACKTOP = j
}
_h264bsdInterpolateVerHalf.X = 1;
function _h264bsdInterpolateVerQuarter(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 444;
  var k, m, n, q, p, o, r;
  m = d;
  d = _h264bsdClip + 512;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(c + g > e) {
        k = 4;
        break a
      }
      if(m < 0) {
        k = 4;
        break a
      }
      k = h + (m + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, m, e, f, g, h + 5, g), m = c = 0, a = l, e = g);
  a += m * e + c;
  f = a + e;
  a = f + e * 5;
  j = f + (j + 2) * e;
  h >>>= 2;
  a:for(;;) {
    if(h == 0) {
      break a
    }
    c = g;
    b:for(;;) {
      if(c == 0) {
        break b
      }
      p = HEAPU8[a + (-e << 1)];
      m = HEAPU8[a + -e];
      k = HEAPU8[a + e];
      n = HEAPU8[a + (e << 1)];
      r = a;
      a = r + 1;
      o = HEAPU8[r];
      r = p + k;
      n -= r << 2;
      n -= r;
      n += 16;
      r = m + o;
      q = HEAPU8[f + (e << 1)];
      n += r << 4;
      n += r << 2;
      n += q;
      n = HEAPU8[d + (n >> 5)];
      r = HEAPU8[j + (e << 1)];
      k += 16;
      n += 1;
      HEAP8[b + 48] = n + r >> 1 & 255;
      r = q + o;
      k -= r << 2;
      k -= r;
      r = p + m;
      n = HEAPU8[f + e];
      k += r << 4;
      k += r << 2;
      k += n;
      k = HEAPU8[d + (k >> 5)];
      r = HEAPU8[j + e];
      o += 16;
      k += 1;
      HEAP8[b + 32] = k + r >> 1 & 255;
      r = n + m;
      o -= r << 2;
      o -= r;
      r = p + q;
      k = HEAPU8[f];
      o += r << 4;
      o += r << 2;
      o += k;
      o = HEAPU8[d + (o >> 5)];
      r = HEAPU8[j];
      m += 16;
      o += 1;
      HEAP8[b + 16] = o + r >> 1 & 255;
      k += p;
      m -= k << 2;
      m -= k;
      q += n;
      o = HEAPU8[f + -e];
      m += q << 4;
      m += q << 2;
      m += o;
      m = HEAPU8[d + (m >> 5)];
      r = HEAPU8[j + -e];
      m += 1;
      k = b;
      b = k + 1;
      HEAP8[k] = m + r >> 1 & 255;
      f += 1;
      j += 1;
      c -= 1
    }
    f += (e << 2) - g;
    a += (e << 2) - g;
    j += (e << 2) - g;
    b += 64 - g;
    h -= 1
  }
  STACKTOP = l
}
_h264bsdInterpolateVerQuarter.X = 1;
function _h264bsdInterpolateHorHalf(a, b, c, d, e, f, g, h) {
  var j = STACKTOP;
  STACKTOP += 444;
  var l, k, m, n, q, p;
  k = d;
  d = _h264bsdClip + 512;
  l = c < 0 ? 4 : 1;
  a:do {
    if(l == 1) {
      if(g + (c + 5) > e) {
        l = 4;
        break a
      }
      if(k < 0) {
        l = 4;
        break a
      }
      l = k + h > f ? 4 : 5;
      break a
    }
  }while(0);
  l == 4 && (_h264bsdFillBlock(a, j, c, k, e, f, g + 5, h, g + 5), k = c = 0, a = j, e = g + 5);
  a += k * e + c;
  f = a + 5;
  a = h;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    q = HEAPU8[f - 5];
    n = HEAPU8[f - 4];
    m = HEAPU8[f - 3];
    k = HEAPU8[f - 2];
    c = HEAPU8[f - 1];
    h = g >>> 2;
    b:for(;;) {
      if(h == 0) {
        break b
      }
      q += 16;
      p = k + m;
      q += p << 4;
      q += p << 2;
      p = c + n;
      l = f;
      f = l + 1;
      l = HEAPU8[l];
      q -= p << 2;
      q -= p;
      q += l;
      q = HEAPU8[d + (q >> 5)];
      n += 16;
      p = c + k;
      var o = b, b = o + 1;
      HEAP8[o] = q & 255;
      n += p << 4;
      n += p << 2;
      p = l + m;
      q = f;
      f = q + 1;
      q = HEAPU8[q];
      n -= p << 2;
      n -= p;
      n += q;
      n = HEAPU8[d + (n >> 5)];
      m += 16;
      p = l + c;
      o = b;
      b = o + 1;
      HEAP8[o] = n & 255;
      m += p << 4;
      m += p << 2;
      p = q + k;
      n = f;
      f = n + 1;
      n = HEAPU8[n];
      m -= p << 2;
      m -= p;
      m += n;
      m = HEAPU8[d + (m >> 5)];
      k += 16;
      p = q + l;
      o = b;
      b = o + 1;
      HEAP8[o] = m & 255;
      k += p << 4;
      k += p << 2;
      p = n + c;
      m = f;
      f = m + 1;
      m = HEAPU8[m];
      k -= p << 2;
      k -= p;
      k += m;
      k = HEAPU8[d + (k >> 5)];
      p = m;
      m = q;
      q = c;
      c = p;
      p = b;
      b = p + 1;
      HEAP8[p] = k & 255;
      k = n;
      n = l;
      h -= 1
    }
    f += e - g;
    b += 16 - g;
    a -= 1
  }
  STACKTOP = j
}
_h264bsdInterpolateHorHalf.X = 1;
function _h264bsdInterpolateHorQuarter(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 444;
  var k, m, n, q, p, o;
  m = d;
  d = _h264bsdClip + 512;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(g + (c + 5) > e) {
        k = 4;
        break a
      }
      if(m < 0) {
        k = 4;
        break a
      }
      k = m + h > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, m, e, f, g + 5, h, g + 5), m = c = 0, a = l, e = g + 5);
  a += m * e + c;
  f = a + 5;
  a = h;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    o = HEAPU8[f - 5];
    p = HEAPU8[f - 4];
    q = HEAPU8[f - 3];
    m = HEAPU8[f - 2];
    c = HEAPU8[f - 1];
    h = g >>> 2;
    b:for(;;) {
      if(h == 0) {
        break b
      }
      o += 16;
      k = m + q;
      o += k << 4;
      o += k << 2;
      k = c + p;
      n = f;
      f = n + 1;
      n = HEAPU8[n];
      o -= k << 2;
      o -= k;
      o += n;
      o = HEAPU8[d + (o >> 5)];
      p += 16;
      k = j != 0 ? 11 : 10;
      k == 11 ? o += m : k == 10 && (o += q);
      k = b;
      b = k + 1;
      HEAP8[k] = o + 1 >> 1 & 255;
      k = c + m;
      p += k << 4;
      p += k << 2;
      k = n + q;
      o = f;
      f = o + 1;
      o = HEAPU8[o];
      p -= k << 2;
      p -= k;
      p += o;
      p = HEAPU8[d + (p >> 5)];
      q += 16;
      k = j != 0 ? 14 : 13;
      k == 14 ? p += c : k == 13 && (p += m);
      k = b;
      b = k + 1;
      HEAP8[k] = p + 1 >> 1 & 255;
      k = n + c;
      q += k << 4;
      q += k << 2;
      k = o + m;
      p = f;
      f = p + 1;
      p = HEAPU8[p];
      q -= k << 2;
      q -= k;
      q += p;
      q = HEAPU8[d + (q >> 5)];
      m += 16;
      k = j != 0 ? 17 : 16;
      k == 17 ? q += n : k == 16 && (q += c);
      k = b;
      b = k + 1;
      HEAP8[k] = q + 1 >> 1 & 255;
      k = o + n;
      m += k << 4;
      m += k << 2;
      k = p + c;
      q = f;
      f = q + 1;
      q = HEAPU8[q];
      m -= k << 2;
      m -= k;
      m += q;
      m = HEAPU8[d + (m >> 5)];
      k = j != 0 ? 20 : 19;
      k == 20 ? m += o : k == 19 && (m += n);
      k = b;
      b = k + 1;
      HEAP8[k] = m + 1 >> 1 & 255;
      m = p;
      p = n;
      k = q;
      q = o;
      o = c;
      c = k;
      h -= 1
    }
    f += e - g;
    b += 16 - g;
    a -= 1
  }
  STACKTOP = l
}
_h264bsdInterpolateHorQuarter.X = 1;
function _h264bsdInterpolateHorVerQuarter(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 444;
  var k, m, n, q, p, o, r;
  m = d;
  d = _h264bsdClip + 512;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(g + (c + 5) > e) {
        k = 4;
        break a
      }
      if(m < 0) {
        k = 4;
        break a
      }
      k = h + (m + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, m, e, f, g + 5, h + 5, g + 5), m = c = 0, a = l, e = g + 5);
  a += m * e + c;
  c = a + (((j & 2) >>> 1) + 2) * e + 5;
  j = e + (a + 2) + (j & 1);
  a = h;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    o = HEAPU8[c - 5];
    k = HEAPU8[c - 4];
    p = HEAPU8[c - 3];
    q = HEAPU8[c - 2];
    m = HEAPU8[c - 1];
    f = g >>> 2;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      o += 16;
      r = q + p;
      o += r << 4;
      o += r << 2;
      r = m + k;
      n = c;
      c = n + 1;
      n = HEAPU8[n];
      o -= r << 2;
      o -= r;
      o += n;
      o = HEAPU8[d + (o >> 5)];
      k += 16;
      r = m + q;
      var s = b, b = s + 1;
      HEAP8[s] = o & 255;
      k += r << 4;
      k += r << 2;
      r = n + p;
      o = c;
      c = o + 1;
      o = HEAPU8[o];
      k -= r << 2;
      k -= r;
      k += o;
      k = HEAPU8[d + (k >> 5)];
      p += 16;
      r = n + m;
      s = b;
      b = s + 1;
      HEAP8[s] = k & 255;
      p += r << 4;
      p += r << 2;
      r = o + q;
      k = c;
      c = k + 1;
      k = HEAPU8[k];
      p -= r << 2;
      p -= r;
      p += k;
      p = HEAPU8[d + (p >> 5)];
      q += 16;
      r = o + n;
      s = b;
      b = s + 1;
      HEAP8[s] = p & 255;
      q += r << 4;
      q += r << 2;
      r = k + m;
      p = c;
      c = p + 1;
      p = HEAPU8[p];
      q -= r << 2;
      q -= r;
      q += p;
      q = HEAPU8[d + (q >> 5)];
      r = p;
      p = o;
      o = m;
      m = r;
      r = b;
      b = r + 1;
      HEAP8[r] = q & 255;
      q = k;
      k = n;
      f -= 1
    }
    c += e - g;
    b += 16 - g;
    a -= 1
  }
  b += -(h << 4);
  c = j + e * 5;
  a = h >>> 2;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    f = g;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      p = HEAPU8[c + (-e << 1)];
      k = HEAPU8[c + -e];
      n = HEAPU8[c + e];
      m = HEAPU8[c + (e << 1)];
      h = c;
      c = h + 1;
      o = HEAPU8[h];
      r = p + n;
      m -= r << 2;
      m -= r;
      m += 16;
      r = k + o;
      q = HEAPU8[j + (e << 1)];
      m += r << 4;
      m += r << 2;
      m += q;
      r = HEAPU8[d + (m >> 5)];
      m = HEAPU8[b + 48];
      n += 16;
      r += 1;
      HEAP8[b + 48] = m + r >> 1 & 255;
      r = q + o;
      n -= r << 2;
      n -= r;
      r = p + k;
      m = HEAPU8[j + e];
      n += r << 4;
      n += r << 2;
      n += m;
      r = HEAPU8[d + (n >> 5)];
      n = HEAPU8[b + 32];
      o += 16;
      r += 1;
      HEAP8[b + 32] = n + r >> 1 & 255;
      n = HEAPU8[j];
      r = m + k;
      o -= r << 2;
      o -= r;
      r = p + q;
      o += r << 4;
      o += r << 2;
      o += n;
      r = HEAPU8[d + (o >> 5)];
      o = HEAPU8[b + 16];
      k += 16;
      r += 1;
      HEAP8[b + 16] = o + r >> 1 & 255;
      o = HEAPU8[j + -e];
      n += p;
      k -= n << 2;
      k -= n;
      q += m;
      k += q << 4;
      k += q << 2;
      k += o;
      r = HEAPU8[d + (k >> 5)];
      k = HEAPU8[b];
      r += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = k + r >> 1 & 255;
      j += 1;
      f -= 1
    }
    j += (e << 2) - g;
    c += (e << 2) - g;
    b += 64 - g;
    a -= 1
  }
  STACKTOP = l
}
_h264bsdInterpolateHorVerQuarter.X = 1;
function _h264bsdInterpolateMidHalf(a, b, c, d, e, f, g, h) {
  var j = STACKTOP;
  STACKTOP += 1788;
  var l, k, m, n, q, p, o, r, s;
  o = j + 444;
  k = d;
  d = e;
  e = _h264bsdClip + 512;
  l = c < 0 ? 4 : 1;
  a:do {
    if(l == 1) {
      if(g + (c + 5) > d) {
        l = 4;
        break a
      }
      if(k < 0) {
        l = 4;
        break a
      }
      l = h + (k + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  l == 4 && (_h264bsdFillBlock(a, j, c, k, d, f, g + 5, h + 5, g + 5), k = c = 0, a = j, d = g + 5);
  a += k * d + c;
  r = o;
  s = a + 5;
  a = h + 5;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    q = HEAPU8[s - 5];
    n = HEAPU8[s - 4];
    m = HEAPU8[s - 3];
    l = HEAPU8[s - 2];
    c = HEAPU8[s - 1];
    f = g >>> 2;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      p = l + m;
      q += p << 4;
      q += p << 2;
      p = c + n;
      k = s;
      s = k + 1;
      k = HEAPU8[k];
      q -= p << 2;
      q -= p;
      q += k;
      p = r;
      r = p + 4;
      HEAP32[p >> 2] = q;
      p = c + l;
      n += p << 4;
      n += p << 2;
      p = k + m;
      q = s;
      s = q + 1;
      q = HEAPU8[q];
      n -= p << 2;
      n -= p;
      n += q;
      p = r;
      r = p + 4;
      HEAP32[p >> 2] = n;
      p = k + c;
      m += p << 4;
      m += p << 2;
      p = q + l;
      n = s;
      s = n + 1;
      n = HEAPU8[n];
      m -= p << 2;
      m -= p;
      m += n;
      p = r;
      r = p + 4;
      HEAP32[p >> 2] = m;
      p = q + k;
      l += p << 4;
      l += p << 2;
      p = n + c;
      m = s;
      s = m + 1;
      m = HEAPU8[m];
      l -= p << 2;
      l -= p;
      l += m;
      p = r;
      r = p + 4;
      HEAP32[p >> 2] = l;
      p = m;
      m = q;
      q = c;
      c = p;
      l = n;
      n = k;
      f -= 1
    }
    s += d - g;
    a -= 1
  }
  o += g << 2;
  d = o + (g * 5 << 2);
  a = h >>> 2;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    f = g;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      m = HEAP32[d + (-g << 1 << 2) >> 2];
      n = HEAP32[d + (-g << 2) >> 2];
      k = HEAP32[d + (g << 2) >> 2];
      c = HEAP32[d + (g << 1 << 2) >> 2];
      h = d;
      d = h + 4;
      q = HEAP32[h >> 2];
      p = m + k;
      c -= p << 2;
      c -= p;
      c += 512;
      p = n + q;
      l = HEAP32[o + (g << 1 << 2) >> 2];
      c += p << 4;
      c += p << 2;
      c += l;
      p = HEAPU8[e + (c >> 10)];
      k += 512;
      HEAP8[b + 48] = p & 255;
      p = l + q;
      k -= p << 2;
      k -= p;
      p = m + n;
      c = HEAP32[o + (g << 2) >> 2];
      k += p << 4;
      k += p << 2;
      k += c;
      p = HEAPU8[e + (k >> 10)];
      q += 512;
      HEAP8[b + 32] = p & 255;
      k = HEAP32[o >> 2];
      p = c + n;
      q -= p << 2;
      q -= p;
      p = m + l;
      q += p << 4;
      q += p << 2;
      q += k;
      p = HEAPU8[e + (q >> 10)];
      n += 512;
      HEAP8[b + 16] = p & 255;
      q = HEAP32[o + (-g << 2) >> 2];
      k += m;
      n -= k << 2;
      n -= k;
      l += c;
      n += l << 4;
      n += l << 2;
      n += q;
      p = HEAPU8[e + (n >> 10)];
      h = b;
      b = h + 1;
      HEAP8[h] = p & 255;
      o += 4;
      f -= 1
    }
    b += 64 - g;
    o += g * 3 << 2;
    d += g * 3 << 2;
    a -= 1
  }
  STACKTOP = j
}
_h264bsdInterpolateMidHalf.X = 1;
function _h264bsdInterpolateMidVerQuarter(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 1788;
  var k, m, n, q, p, o, r, s, t;
  r = l + 444;
  m = d;
  d = e;
  e = _h264bsdClip + 512;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(g + (c + 5) > d) {
        k = 4;
        break a
      }
      if(m < 0) {
        k = 4;
        break a
      }
      k = h + (m + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, m, d, f, g + 5, h + 5, g + 5), m = c = 0, a = l, d = g + 5);
  a += m * d + c;
  s = r;
  t = a + 5;
  a = h + 5;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    p = HEAPU8[t - 5];
    m = HEAPU8[t - 4];
    q = HEAPU8[t - 3];
    n = HEAPU8[t - 2];
    c = HEAPU8[t - 1];
    f = g >>> 2;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      o = n + q;
      p += o << 4;
      p += o << 2;
      o = c + m;
      k = t;
      t = k + 1;
      k = HEAPU8[k];
      p -= o << 2;
      p -= o;
      p += k;
      o = s;
      s = o + 4;
      HEAP32[o >> 2] = p;
      o = c + n;
      m += o << 4;
      m += o << 2;
      o = k + q;
      p = t;
      t = p + 1;
      p = HEAPU8[p];
      m -= o << 2;
      m -= o;
      m += p;
      o = s;
      s = o + 4;
      HEAP32[o >> 2] = m;
      o = k + c;
      q += o << 4;
      q += o << 2;
      o = p + n;
      m = t;
      t = m + 1;
      m = HEAPU8[m];
      q -= o << 2;
      q -= o;
      q += m;
      o = s;
      s = o + 4;
      HEAP32[o >> 2] = q;
      o = p + k;
      n += o << 4;
      n += o << 2;
      o = m + c;
      q = t;
      t = q + 1;
      q = HEAPU8[q];
      n -= o << 2;
      n -= o;
      n += q;
      o = s;
      s = o + 4;
      HEAP32[o >> 2] = n;
      o = q;
      q = p;
      p = c;
      c = o;
      n = m;
      m = k;
      f -= 1
    }
    t += d - g;
    a -= 1
  }
  r += g << 2;
  d = r + (g * 5 << 2);
  j = r + ((j + 2) * g << 2);
  a = h >>> 2;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    f = g;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      q = HEAP32[d + (-g << 1 << 2) >> 2];
      m = HEAP32[d + (-g << 2) >> 2];
      k = HEAP32[d + (g << 2) >> 2];
      c = HEAP32[d + (g << 1 << 2) >> 2];
      h = d;
      d = h + 4;
      p = HEAP32[h >> 2];
      o = q + k;
      c -= o << 2;
      c -= o;
      c += 512;
      o = m + p;
      n = HEAP32[r + (g << 1 << 2) >> 2];
      c += o << 4;
      c += o << 2;
      o = HEAP32[j + (g << 1 << 2) >> 2];
      c += n;
      c = HEAPU8[e + (c >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      k += 512;
      c += 1;
      HEAP8[b + 48] = o + c >> 1 & 255;
      o = n + p;
      k -= o << 2;
      k -= o;
      o = q + m;
      c = HEAP32[r + (g << 2) >> 2];
      k += o << 4;
      k += o << 2;
      o = HEAP32[j + (g << 2) >> 2];
      k += c;
      k = HEAPU8[e + (k >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      p += 512;
      k += 1;
      HEAP8[b + 32] = o + k >> 1 & 255;
      k = HEAP32[r >> 2];
      o = c + m;
      p -= o << 2;
      p -= o;
      o = q + n;
      p += o << 4;
      p += o << 2;
      o = HEAP32[j >> 2];
      p += k;
      p = HEAPU8[e + (p >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      m += 512;
      p += 1;
      HEAP8[b + 16] = o + p >> 1 & 255;
      p = HEAP32[r + (-g << 2) >> 2];
      k += q;
      m -= k << 2;
      m -= k;
      n += c;
      m += n << 4;
      m += n << 2;
      o = HEAP32[j + (-g << 2) >> 2];
      m += p;
      m = HEAPU8[e + (m >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      m += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = o + m >> 1 & 255;
      r += 4;
      j += 4;
      f -= 1
    }
    b += 64 - g;
    r += g * 3 << 2;
    d += g * 3 << 2;
    j += g * 3 << 2;
    a -= 1
  }
  STACKTOP = l
}
_h264bsdInterpolateMidVerQuarter.X = 1;
function _h264bsdInterpolateMidHorQuarter(a, b, c, d, e, f, g, h, j) {
  var l = STACKTOP;
  STACKTOP += 1788;
  var k, m, n, q, p, o, r, s, t, u = l + 444, v;
  m = e;
  v = g + 5;
  e = _h264bsdClip + 512;
  k = c < 0 ? 4 : 1;
  a:do {
    if(k == 1) {
      if(g + (c + 5) > m) {
        k = 4;
        break a
      }
      if(d < 0) {
        k = 4;
        break a
      }
      k = h + (d + 5) > f ? 4 : 5;
      break a
    }
  }while(0);
  k == 4 && (_h264bsdFillBlock(a, l, c, d, m, f, g + 5, h + 5, g + 5), d = c = 0, a = l, m = g + 5);
  a += d * m + c;
  r = u + (v << 2);
  s = a + m;
  t = s + m * 5;
  a = h >>> 2;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    f = v;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      n = HEAPU8[t + (-m << 1)];
      q = HEAPU8[t + -m];
      d = HEAPU8[t + m];
      c = HEAPU8[t + (m << 1)];
      k = t;
      t = k + 1;
      p = HEAPU8[k];
      o = n + d;
      c -= o << 2;
      c -= o;
      o = q + p;
      k = HEAPU8[s + (m << 1)];
      c += o << 4;
      c += o << 2;
      c += k;
      HEAP32[r + (v << 1 << 2) >> 2] = c;
      o = k + p;
      d -= o << 2;
      d -= o;
      o = n + q;
      c = HEAPU8[s + m];
      d += o << 4;
      d += o << 2;
      d += c;
      HEAP32[r + (v << 2) >> 2] = d;
      d = HEAPU8[s];
      o = c + q;
      p -= o << 2;
      p -= o;
      o = n + k;
      p += o << 4;
      p += o << 2;
      p += d;
      HEAP32[r >> 2] = p;
      p = HEAPU8[s + -m];
      d += n;
      q -= d << 2;
      q -= d;
      k += c;
      q += k << 4;
      q += k << 2;
      q += p;
      HEAP32[r + (-v << 2) >> 2] = q;
      r += 4;
      s += 1;
      f -= 1
    }
    s += (m << 2) - g - 5;
    t += (m << 2) - g - 5;
    r += v * 3 << 2;
    a -= 1
  }
  m = u + 20;
  j = u + 8 + (j << 2);
  a = h;
  a:for(;;) {
    if(a == 0) {
      break a
    }
    p = HEAP32[m - 20 >> 2];
    q = HEAP32[m - 16 >> 2];
    n = HEAP32[m - 12 >> 2];
    k = HEAP32[m - 8 >> 2];
    c = HEAP32[m - 4 >> 2];
    f = g >>> 2;
    b:for(;;) {
      if(f == 0) {
        break b
      }
      p += 512;
      o = k + n;
      p += o << 4;
      p += o << 2;
      o = c + q;
      d = m;
      m = d + 4;
      d = HEAP32[d >> 2];
      p -= o << 2;
      p -= o;
      h = j;
      j = h + 4;
      o = HEAP32[h >> 2];
      p += d;
      p = HEAPU8[e + (p >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      q += 512;
      p += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = p + o >> 1 & 255;
      o = c + k;
      q += o << 4;
      q += o << 2;
      o = d + n;
      h = m;
      m = h + 4;
      p = HEAP32[h >> 2];
      q -= o << 2;
      q -= o;
      h = j;
      j = h + 4;
      o = HEAP32[h >> 2];
      q += p;
      q = HEAPU8[e + (q >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      n += 512;
      q += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = q + o >> 1 & 255;
      o = d + c;
      n += o << 4;
      n += o << 2;
      o = p + k;
      q = m;
      m = q + 4;
      q = HEAP32[q >> 2];
      n -= o << 2;
      n -= o;
      h = j;
      j = h + 4;
      o = HEAP32[h >> 2];
      n += q;
      n = HEAPU8[e + (n >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      k += 512;
      n += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = n + o >> 1 & 255;
      o = p + d;
      k += o << 4;
      k += o << 2;
      o = q + c;
      n = m;
      m = n + 4;
      n = HEAP32[n >> 2];
      k -= o << 2;
      k -= o;
      h = j;
      j = h + 4;
      o = HEAP32[h >> 2];
      k += n;
      k = HEAPU8[e + (k >> 10)];
      o += 16;
      o = HEAPU8[e + (o >> 5)];
      k += 1;
      h = b;
      b = h + 1;
      HEAP8[h] = k + o >> 1 & 255;
      k = q;
      q = d;
      o = n;
      n = p;
      p = c;
      c = o;
      f -= 1
    }
    m += 20;
    j += 20;
    b += 16 - g;
    a -= 1
  }
  STACKTOP = l
}
_h264bsdInterpolateMidHorQuarter.X = 1;
function _FillRow1(a, b, c, d) {
  _H264SwDecMemcpy(b, a, d)
}
function _h264bsdPredictSamples(a, b, c, d, e, f, g, h, j) {
  var l, k, m, n, q, p, o;
  o = a + (g << 4) + f;
  l = HEAP16[b >> 1] & 3;
  k = HEAP16[b + 2 >> 1] & 3;
  m = HEAP32[c + 4 >> 2] << 4;
  n = HEAP32[c + 8 >> 2] << 4;
  q = d + f + (HEAP16[b >> 1] >> 2);
  p = e + g + (HEAP16[b + 2 >> 1] >> 2);
  l = HEAP32[_lumaFracPos + (l << 4) + (k << 2) >> 2];
  l = l == 0 ? 1 : l == 1 ? 2 : l == 2 ? 3 : l == 3 ? 4 : l == 4 ? 5 : l == 5 ? 6 : l == 6 ? 7 : l == 7 ? 8 : l == 8 ? 9 : l == 9 ? 10 : l == 10 ? 11 : l == 11 ? 12 : l == 12 ? 13 : l == 13 ? 14 : l == 14 ? 15 : 16;
  l == 16 ? _h264bsdInterpolateHorVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 3) : l == 1 ? _h264bsdFillBlock(HEAP32[c >> 2], o, q, p, m, n, h, j, 16) : l == 2 ? _h264bsdInterpolateVerQuarter(HEAP32[c >> 2], o, q, p - 2, m, n, h, j, 0) : l == 3 ? _h264bsdInterpolateVerHalf(HEAP32[c >> 2], o, q, p - 2, m, n, h, j) : l == 4 ? _h264bsdInterpolateVerQuarter(HEAP32[c >> 2], o, q, p - 2, m, n, h, j, 1) : l == 5 ? _h264bsdInterpolateHorQuarter(HEAP32[c >> 2], o, q - 2, p, m, n, h, j, 0) : l == 
  6 ? _h264bsdInterpolateHorVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 0) : l == 7 ? _h264bsdInterpolateMidHorQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 0) : l == 8 ? _h264bsdInterpolateHorVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 2) : l == 9 ? _h264bsdInterpolateHorHalf(HEAP32[c >> 2], o, q - 2, p, m, n, h, j) : l == 10 ? _h264bsdInterpolateMidVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 0) : l == 11 ? _h264bsdInterpolateMidHalf(HEAP32[c >> 2], o, 
  q - 2, p - 2, m, n, h, j) : l == 12 ? _h264bsdInterpolateMidVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 1) : l == 13 ? _h264bsdInterpolateHorQuarter(HEAP32[c >> 2], o, q - 2, p, m, n, h, j, 1) : l == 14 ? _h264bsdInterpolateHorVerQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 1) : l == 15 && _h264bsdInterpolateMidHorQuarter(HEAP32[c >> 2], o, q - 2, p - 2, m, n, h, j, 1);
  _PredictChroma(a + 256 + (g >>> 1 << 3) + (f >>> 1), d + f, e + g, h, j, b, c)
}
_h264bsdPredictSamples.X = 1;
function _PredictChroma(a, b, c, d, e, f, g) {
  var h, j, l, k;
  h = HEAP32[g + 4 >> 2] << 3;
  j = HEAP32[g + 8 >> 2] << 3;
  b = (b >>> 1) + (HEAP16[f >> 1] >> 3);
  l = (c >>> 1) + (HEAP16[f + 2 >> 1] >> 3);
  c = HEAP16[f >> 1] & 7;
  f = HEAP16[f + 2 >> 1] & 7;
  d >>>= 1;
  e >>>= 1;
  k = HEAP32[g >> 2] + (HEAP32[g + 4 >> 2] << 8) * HEAP32[g + 8 >> 2];
  g = c != 0 ? 1 : 3;
  a:do {
    if(g == 1) {
      if(f == 0) {
        g = 3;
        break a
      }
      _h264bsdInterpolateChromaHorVer(k, a, b, l, h, j, c, f, d, e);
      g = 10;
      break a
    }
  }while(0);
  g == 3 && (g = c != 0 ? 4 : 5, g == 4 ? _h264bsdInterpolateChromaHor(k, a, b, l, h, j, c, d, e) : g == 5 && (g = f != 0 ? 6 : 7, g == 6 ? _h264bsdInterpolateChromaVer(k, a, b, l, h, j, f, d, e) : g == 7 && (_h264bsdFillBlock(k, a, b, l, h, j, d, e, 8), k += h * j, _h264bsdFillBlock(k, a + 64, b, l, h, j, d, e, 8))))
}
_PredictChroma.X = 1;
function _h264bsdFillRow7(a, b, c, d, e) {
  var f;
  (c != 0 ? 1 : 2) == 1 && (f = HEAP8[a]);
  a:for(;;) {
    if(c == 0) {
      break a
    }
    var g = b, b = g + 1;
    HEAP8[g] = f;
    c -= 1
  }
  a:for(;;) {
    if(d == 0) {
      break a
    }
    c = a;
    a = c + 1;
    c = HEAP8[c];
    g = b;
    b = g + 1;
    HEAP8[g] = c;
    d -= 1
  }
  (e != 0 ? 11 : 12) == 11 && (f = HEAP8[a - 1]);
  a:for(;;) {
    if(e == 0) {
      break a
    }
    a = b;
    b = a + 1;
    HEAP8[a] = f;
    e -= 1
  }
}
_h264bsdFillRow7.X = 1;
function _SetPicNums(a, b) {
  var c, d, e;
  d = 0;
  a:for(;;) {
    if(!(d < HEAPU32[a + 40 >> 2])) {
      break a
    }
    c = HEAP32[HEAP32[a >> 2] + d * 40 + 20 >> 2] == 1 ? 4 : 3;
    b:do {
      if(c == 3) {
        c = HEAP32[HEAP32[a >> 2] + d * 40 + 20 >> 2] == 2 ? 4 : 8;
        break b
      }
    }while(0);
    c == 4 && (c = HEAPU32[HEAP32[a >> 2] + d * 40 + 12 >> 2] > b ? 5 : 6, c == 5 ? e = HEAP32[HEAP32[a >> 2] + d * 40 + 12 >> 2] - HEAP32[a + 32 >> 2] : c == 6 && (e = HEAP32[HEAP32[a >> 2] + d * 40 + 12 >> 2]), HEAP32[HEAP32[a >> 2] + d * 40 + 8 >> 2] = e);
    d += 1
  }
}
_SetPicNums.X = 1;
function _FindDpbPic(a, b, c) {
  var d, e, f;
  f = e = 0;
  c = c != 0 ? 1 : 12;
  do {
    if(c == 1) {
      b:for(;;) {
        if(e < HEAPU32[a + 24 >> 2]) {
          c = 3
        }else {
          var g = 0, c = 4
        }
        c == 3 && (g = f != 0 ^ 1);
        if(!g) {
          c = 11;
          break b
        }
        c = HEAP32[HEAP32[a >> 2] + e * 40 + 20 >> 2] == 1 ? 7 : 6;
        c:do {
          if(c == 6) {
            c = HEAP32[HEAP32[a >> 2] + e * 40 + 20 >> 2] == 2 ? 7 : 9;
            break c
          }
        }while(0);
        c:do {
          if(c == 7) {
            if(HEAP32[HEAP32[a >> 2] + e * 40 + 8 >> 2] != b) {
              c = 9;
              break c
            }
            f = 1;
            c = 10;
            break c
          }
        }while(0);
        c == 9 && (e += 1)
      }
    }else {
      if(c == 12) {
        b:for(;;) {
          if(e < HEAPU32[a + 24 >> 2]) {
            c = 14
          }else {
            var h = 0, c = 15
          }
          c == 14 && (h = f != 0 ^ 1);
          if(!h) {
            c = 21;
            break b
          }
          c = HEAP32[HEAP32[a >> 2] + e * 40 + 20 >> 2] == 3 ? 17 : 19;
          c:do {
            if(c == 17) {
              if(HEAP32[HEAP32[a >> 2] + e * 40 + 8 >> 2] != b) {
                c = 19;
                break c
              }
              f = 1;
              c = 20;
              break c
            }
          }while(0);
          c == 19 && (e += 1)
        }
      }
    }
  }while(0);
  c = f != 0 ? 23 : 24;
  c == 23 ? d = e : c == 24 && (d = -1);
  return d
}
_FindDpbPic.X = 1;
function _h264bsdReorderRefPicList(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n, q, p;
  _SetPicNums(a, c);
  e = HEAP32[b >> 2] != 0 ? 2 : 1;
  do {
    if(e == 2) {
      k = 0;
      l = c;
      g = 0;
      b:for(;;) {
        if(!(HEAPU32[b + 4 + g * 12 >> 2] < 3)) {
          e = 30;
          break b
        }
        e = HEAPU32[b + 4 + g * 12 >> 2] < 2 ? 5 : 15;
        e == 5 ? (e = HEAP32[b + 4 + g * 12 >> 2] == 0 ? 6 : 9, e == 6 ? (n = l - HEAP32[b + 4 + g * 12 + 4 >> 2], e = n < 0 ? 7 : 8, e == 7 && (n += HEAP32[a + 32 >> 2])) : e == 9 && (n = l + HEAP32[b + 4 + g * 12 + 4 >> 2], e = n >= HEAP32[a + 32 >> 2] ? 10 : 11, e == 10 && (n -= HEAP32[a + 32 >> 2])), m = l = n, e = n > c ? 13 : 14, e == 13 && (m -= HEAP32[a + 32 >> 2]), p = 1) : e == 15 && (m = HEAP32[b + 4 + g * 12 + 8 >> 2], p = 0);
        q = _FindDpbPic(a, m, p);
        if(q < 0) {
          e = 18;
          break b
        }
        if(!(HEAPU32[HEAP32[a >> 2] + q * 40 + 20 >> 2] > 1)) {
          e = 18;
          break b
        }
        h = d;
        c:for(;;) {
          if(!(h > k)) {
            e = 23;
            break c
          }
          HEAP32[HEAP32[a + 4 >> 2] + (h << 2) >> 2] = HEAP32[HEAP32[a + 4 >> 2] + (h - 1 << 2) >> 2];
          h -= 1
        }
        h = HEAP32[a >> 2] + q * 40;
        j = k;
        k = j + 1;
        HEAP32[HEAP32[a + 4 >> 2] + (j << 2) >> 2] = h;
        h = j = k;
        c:for(;;) {
          if(!(h <= d)) {
            e = 29;
            break c
          }
          e = HEAP32[HEAP32[a + 4 >> 2] + (h << 2) >> 2] != HEAP32[a >> 2] + q * 40 ? 26 : 27;
          if(e == 26) {
            var o = HEAP32[HEAP32[a + 4 >> 2] + (h << 2) >> 2], r = j;
            j = r + 1;
            HEAP32[HEAP32[a + 4 >> 2] + (r << 2) >> 2] = o
          }
          h += 1
        }
        g += 1
      }
      e == 30 ? f = 0 : e == 18 && (f = 1)
    }else {
      e == 1 && (f = 0)
    }
  }while(0);
  return f
}
_h264bsdReorderRefPicList.X = 1;
function _h264bsdMarkDecRefPic(a, b, c, d, e, f, g, h) {
  var j, l, k, m, c = HEAP32[c >> 2] != HEAP32[HEAP32[a + 8 >> 2] >> 2] ? 1 : 2;
  do {
    if(c == 1) {
      j = 1
    }else {
      if(c == 2) {
        l = HEAP32[a + 52 >> 2] = 0;
        m = HEAP32[a + 56 >> 2] != 0 ? 0 : 1;
        c = b == 0 ? 3 : 6;
        do {
          if(c == 3) {
            HEAP32[HEAP32[a + 8 >> 2] + 20 >> 2] = 0, HEAP32[HEAP32[a + 8 >> 2] + 12 >> 2] = d, HEAP32[HEAP32[a + 8 >> 2] + 8 >> 2] = d, HEAP32[HEAP32[a + 8 >> 2] + 16 >> 2] = e, HEAP32[HEAP32[a + 8 >> 2] + 24 >> 2] = m, c = HEAP32[a + 56 >> 2] != 0 ? 5 : 4, c == 4 && (HEAP32[a + 44 >> 2] += 1)
          }else {
            if(c == 6) {
              c = f != 0 ? 7 : 14;
              do {
                if(c == 7) {
                  HEAP32[a + 20 >> 2] = 0;
                  HEAP32[a + 16 >> 2] = 0;
                  _Mmcop5(a);
                  c = HEAP32[b >> 2] != 0 ? 9 : 8;
                  d:do {
                    if(c == 8) {
                      c = HEAP32[a + 56 >> 2] != 0 ? 9 : 10;
                      break d
                    }
                  }while(0);
                  c == 9 && (HEAP32[a + 16 >> 2] = 0, HEAP32[a + 20 >> 2] = 0);
                  c = HEAP32[b + 4 >> 2] != 0 ? 11 : 12;
                  c == 11 ? (HEAP32[HEAP32[a + 8 >> 2] + 20 >> 2] = 3, HEAP32[a + 36 >> 2] = 0) : c == 12 && (HEAP32[HEAP32[a + 8 >> 2] + 20 >> 2] = 2, HEAP32[a + 36 >> 2] = 65535);
                  HEAP32[HEAP32[a + 8 >> 2] + 12 >> 2] = 0;
                  HEAP32[HEAP32[a + 8 >> 2] + 8 >> 2] = 0;
                  HEAP32[HEAP32[a + 8 >> 2] + 16 >> 2] = 0;
                  HEAP32[HEAP32[a + 8 >> 2] + 24 >> 2] = m;
                  HEAP32[a + 44 >> 2] = 1;
                  HEAP32[a + 40 >> 2] = 1
                }else {
                  if(c == 14) {
                    k = 0;
                    c = HEAP32[b + 8 >> 2] != 0 ? 15 : 31;
                    do {
                      if(c == 15) {
                        j = 0;
                        e:for(;;) {
                          if(HEAP32[b + 12 + j * 20 >> 2] == 0) {
                            c = 30;
                            break e
                          }
                          c = HEAP32[b + 12 + j * 20 >> 2];
                          c = c == 1 ? 18 : c == 2 ? 19 : c == 3 ? 20 : c == 4 ? 21 : c == 5 ? 22 : c == 6 ? 23 : 26;
                          c == 26 ? l = 1 : c == 18 ? l = _Mmcop1(a, d, HEAP32[b + 12 + j * 20 + 4 >> 2]) : c == 19 ? l = _Mmcop2(a, HEAP32[b + 12 + j * 20 + 8 >> 2]) : c == 20 ? l = _Mmcop3(a, d, HEAP32[b + 12 + j * 20 + 4 >> 2], HEAP32[b + 12 + j * 20 + 12 >> 2]) : c == 21 ? l = _Mmcop4(a, HEAP32[b + 12 + j * 20 + 16 >> 2]) : c == 22 ? (l = _Mmcop5(a), HEAP32[a + 52 >> 2] = 1, d = 0) : c == 23 && (l = _Mmcop6(a, d, e, HEAP32[b + 12 + j * 20 + 12 >> 2]), c = l == 0 ? 24 : 25, c == 24 && (k = 1));
                          if(l != 0) {
                            c = 28;
                            break e
                          }
                          j += 1
                        }
                      }else {
                        c == 31 && (l = _SlidingWindowRefPicMarking(a))
                      }
                    }while(0);
                    c = k != 0 ? 37 : 33;
                    c == 33 && (c = HEAPU32[a + 40 >> 2] < HEAPU32[a + 24 >> 2] ? 34 : 35, c == 34 ? (HEAP32[HEAP32[a + 8 >> 2] + 12 >> 2] = d, HEAP32[HEAP32[a + 8 >> 2] + 8 >> 2] = d, HEAP32[HEAP32[a + 8 >> 2] + 16 >> 2] = e, HEAP32[HEAP32[a + 8 >> 2] + 20 >> 2] = 2, HEAP32[HEAP32[a + 8 >> 2] + 24 >> 2] = m, HEAP32[a + 44 >> 2] += 1, HEAP32[a + 40 >> 2] += 1) : c == 35 && (l = 1))
                  }
                }
              }while(0)
            }
          }
        }while(0);
        HEAP32[HEAP32[a + 8 >> 2] + 36 >> 2] = f;
        HEAP32[HEAP32[a + 8 >> 2] + 28 >> 2] = g;
        HEAP32[HEAP32[a + 8 >> 2] + 32 >> 2] = h;
        c = HEAP32[a + 56 >> 2] != 0 ? 40 : 41;
        do {
          if(c == 40) {
            HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) >> 2] = HEAP32[HEAP32[a + 8 >> 2] >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 12 >> 2] = HEAP32[HEAP32[a + 8 >> 2] + 36 >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 4 >> 2] = HEAP32[HEAP32[a + 8 >> 2] + 28 >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 8 >> 2] = HEAP32[HEAP32[a + 8 >> 2] + 32 >> 2], HEAP32[a + 16 >> 2] += 1
          }else {
            if(c == 41) {
              c:for(;;) {
                if(!(HEAPU32[a + 44 >> 2] > HEAPU32[a + 28 >> 2])) {
                  c = 44;
                  break c
                }
                _OutputPicture(a)
              }
            }
          }
        }while(0);
        _ShellSort(HEAP32[a >> 2], HEAP32[a + 28 >> 2] + 1);
        j = l
      }
    }
  }while(0);
  return j
}
_h264bsdMarkDecRefPic.X = 1;
function _Mmcop5(a) {
  var b, c;
  c = 0;
  a:for(;;) {
    if(!(c < 16)) {
      break a
    }
    b = HEAP32[HEAP32[a >> 2] + c * 40 + 20 >> 2] != 0 ? 3 : 6;
    b == 3 && (HEAP32[HEAP32[a >> 2] + c * 40 + 20 >> 2] = 0, b = HEAP32[HEAP32[a >> 2] + c * 40 + 24 >> 2] != 0 ? 5 : 4, b == 4 && (HEAP32[a + 44 >> 2] -= 1));
    c += 1
  }
  a:for(;;) {
    if(_OutputPicture(a) != 0) {
      break a
    }
  }
  HEAP32[a + 40 >> 2] = 0;
  HEAP32[a + 36 >> 2] = 65535;
  return HEAP32[a + 48 >> 2] = 0
}
_Mmcop5.X = 1;
function _Mmcop1(a, b, c) {
  var d, c = _FindDpbPic(a, b - c, 1), b = c < 0 ? 1 : 2;
  b == 1 ? d = 1 : b == 2 && (HEAP32[HEAP32[a >> 2] + c * 40 + 20 >> 2] = 0, HEAP32[a + 40 >> 2] -= 1, b = HEAP32[HEAP32[a >> 2] + c * 40 + 24 >> 2] != 0 ? 4 : 3, b == 3 && (HEAP32[a + 44 >> 2] -= 1), d = 0);
  return d
}
_Mmcop1.X = 1;
function _Mmcop2(a, b) {
  var c, d, e;
  e = _FindDpbPic(a, b, 0);
  c = e < 0 ? 1 : 2;
  c == 1 ? d = 1 : c == 2 && (HEAP32[HEAP32[a >> 2] + e * 40 + 20 >> 2] = 0, HEAP32[a + 40 >> 2] -= 1, c = HEAP32[HEAP32[a >> 2] + e * 40 + 24 >> 2] != 0 ? 4 : 3, c == 3 && (HEAP32[a + 44 >> 2] -= 1), d = 0);
  return d
}
function _Mmcop3(a, b, c, d) {
  var e, f, g;
  e = HEAP32[a + 36 >> 2] == 65535 ? 2 : 1;
  a:do {
    if(e == 1) {
      if(d > HEAPU32[a + 36 >> 2]) {
        e = 2;
        break a
      }
      g = 0;
      b:for(;;) {
        if(!(g < HEAPU32[a + 24 >> 2])) {
          e = 12;
          break b
        }
        e = HEAP32[HEAP32[a >> 2] + g * 40 + 20 >> 2] == 3 ? 6 : 10;
        do {
          if(e == 6 && HEAP32[HEAP32[a >> 2] + g * 40 + 8 >> 2] == d) {
            e = 7;
            break b
          }
        }while(0);
        g += 1
      }
      e == 7 && (HEAP32[HEAP32[a >> 2] + g * 40 + 20 >> 2] = 0, HEAP32[a + 40 >> 2] -= 1, e = HEAP32[HEAP32[a >> 2] + g * 40 + 24 >> 2] != 0 ? 9 : 8, e == 8 && (HEAP32[a + 44 >> 2] -= 1));
      e = b - c;
      g = _FindDpbPic(a, e, 1);
      e = g < 0 ? 13 : 14;
      do {
        if(e == 13) {
          f = 1;
          e = 17;
          break a
        }else {
          if(e == 14) {
            e = HEAPU32[HEAP32[a >> 2] + g * 40 + 20 >> 2] > 1 ? 16 : 15;
            do {
              if(e == 16) {
                HEAP32[HEAP32[a >> 2] + g * 40 + 20 >> 2] = 3;
                HEAP32[HEAP32[a >> 2] + g * 40 + 8 >> 2] = d;
                f = 0;
                e = 17;
                break a
              }else {
                if(e == 15) {
                  f = 1;
                  e = 17;
                  break a
                }
              }
            }while(0)
          }
        }
      }while(0)
    }
  }while(0);
  e == 2 && (f = 1);
  return f
}
_Mmcop3.X = 1;
function _Mmcop4(a, b) {
  var c, d;
  HEAP32[a + 36 >> 2] = b;
  d = 0;
  a:for(;;) {
    if(!(d < HEAPU32[a + 24 >> 2])) {
      break a
    }
    c = HEAP32[HEAP32[a >> 2] + d * 40 + 20 >> 2] == 3 ? 3 : 8;
    b:do {
      if(c == 3) {
        c = HEAPU32[HEAP32[a >> 2] + d * 40 + 8 >> 2] > b ? 5 : 4;
        do {
          if(c == 4 && HEAP32[a + 36 >> 2] != 65535) {
            break b
          }
        }while(0);
        HEAP32[HEAP32[a >> 2] + d * 40 + 20 >> 2] = 0;
        HEAP32[a + 40 >> 2] -= 1;
        c = HEAP32[HEAP32[a >> 2] + d * 40 + 24 >> 2] != 0 ? 7 : 6;
        c == 6 && (HEAP32[a + 44 >> 2] -= 1)
      }
    }while(0);
    d += 1
  }
  return 0
}
_Mmcop4.X = 1;
function _Mmcop6(a, b, c, d) {
  var e, f, g;
  e = HEAP32[a + 36 >> 2] == 65535 ? 2 : 1;
  a:do {
    if(e == 1) {
      if(d > HEAPU32[a + 36 >> 2]) {
        e = 2;
        break a
      }
      g = 0;
      b:for(;;) {
        if(!(g < HEAPU32[a + 24 >> 2])) {
          e = 12;
          break b
        }
        e = HEAP32[HEAP32[a >> 2] + g * 40 + 20 >> 2] == 3 ? 6 : 10;
        do {
          if(e == 6 && HEAP32[HEAP32[a >> 2] + g * 40 + 8 >> 2] == d) {
            e = 7;
            break b
          }
        }while(0);
        g += 1
      }
      e == 7 && (HEAP32[HEAP32[a >> 2] + g * 40 + 20 >> 2] = 0, HEAP32[a + 40 >> 2] -= 1, e = HEAP32[HEAP32[a >> 2] + g * 40 + 24 >> 2] != 0 ? 9 : 8, e == 8 && (HEAP32[a + 44 >> 2] -= 1));
      e = HEAPU32[a + 40 >> 2] < HEAPU32[a + 24 >> 2] ? 13 : 17;
      do {
        if(e == 13) {
          HEAP32[HEAP32[a + 8 >> 2] + 12 >> 2] = b;
          HEAP32[HEAP32[a + 8 >> 2] + 8 >> 2] = d;
          HEAP32[HEAP32[a + 8 >> 2] + 16 >> 2] = c;
          HEAP32[HEAP32[a + 8 >> 2] + 20 >> 2] = 3;
          e = HEAP32[a + 56 >> 2] != 0 ? 14 : 15;
          e == 14 ? HEAP32[HEAP32[a + 8 >> 2] + 24 >> 2] = 0 : e == 15 && (HEAP32[HEAP32[a + 8 >> 2] + 24 >> 2] = 1);
          HEAP32[a + 40 >> 2] += 1;
          HEAP32[a + 44 >> 2] += 1;
          f = 0;
          e = 18;
          break a
        }else {
          if(e == 17) {
            f = 1;
            e = 18;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  e == 2 && (f = 1);
  return f
}
_Mmcop6.X = 1;
function _SlidingWindowRefPicMarking(a) {
  var b, c, d, e, f;
  b = HEAPU32[a + 40 >> 2] < HEAPU32[a + 24 >> 2] ? 1 : 2;
  do {
    if(b == 1) {
      c = 0
    }else {
      if(b == 2) {
        d = -1;
        f = e = 0;
        b:for(;;) {
          if(!(f < HEAPU32[a + 40 >> 2])) {
            break b
          }
          b = HEAP32[HEAP32[a >> 2] + f * 40 + 20 >> 2] == 1 ? 6 : 5;
          c:do {
            if(b == 5) {
              b = HEAP32[HEAP32[a >> 2] + f * 40 + 20 >> 2] == 2 ? 6 : 10;
              break c
            }
          }while(0);
          do {
            if(b == 6) {
              b = HEAP32[HEAP32[a >> 2] + f * 40 + 8 >> 2] < e ? 8 : 7;
              d:do {
                if(b == 7) {
                  b = d == -1 ? 8 : 9;
                  break d
                }
              }while(0);
              b == 8 && (d = f, e = HEAP32[HEAP32[a >> 2] + f * 40 + 8 >> 2])
            }
          }while(0);
          f += 1
        }
        b = d >= 0 ? 13 : 16;
        b == 13 ? (HEAP32[HEAP32[a >> 2] + d * 40 + 20 >> 2] = 0, HEAP32[a + 40 >> 2] -= 1, b = HEAP32[HEAP32[a >> 2] + d * 40 + 24 >> 2] != 0 ? 15 : 14, b == 14 && (HEAP32[a + 44 >> 2] -= 1), c = 0) : b == 16 && (c = 1)
      }
    }
  }while(0);
  return c
}
_SlidingWindowRefPicMarking.X = 1;
function _h264bsdGetRefPicData(a, b) {
  var c, d;
  c = b > 16 ? 2 : 1;
  a:do {
    if(c == 1) {
      if(HEAP32[HEAP32[a + 4 >> 2] + (b << 2) >> 2] == 0) {
        c = 2;
        break a
      }
      c = HEAPU32[HEAP32[HEAP32[a + 4 >> 2] + (b << 2) >> 2] + 20 >> 2] > 1 ? 5 : 4;
      do {
        if(c == 5) {
          d = HEAP32[HEAP32[HEAP32[a + 4 >> 2] + (b << 2) >> 2] >> 2];
          c = 6;
          break a
        }else {
          if(c == 4) {
            d = 0;
            c = 6;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  c == 2 && (d = 0);
  return d
}
function _h264bsdAllocateDpbImage(a) {
  HEAP32[a + 8 >> 2] = HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40;
  return HEAP32[HEAP32[a + 8 >> 2] >> 2]
}
function _OutputPicture(a) {
  var b, c, d;
  b = HEAP32[a + 56 >> 2] != 0 ? 1 : 2;
  b == 1 ? c = 1 : b == 2 && (d = _FindSmallestPicOrderCnt(a), b = d == 0 ? 3 : 4, b == 3 ? c = 1 : b == 4 && (HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) >> 2] = HEAP32[d >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 12 >> 2] = HEAP32[d + 36 >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 4 >> 2] = HEAP32[d + 28 >> 2], HEAP32[HEAP32[a + 12 >> 2] + (HEAP32[a + 16 >> 2] << 4) + 8 >> 2] = HEAP32[d + 32 >> 2], HEAP32[a + 16 >> 2] += 1, HEAP32[d + 24 >> 
  2] = 0, b = HEAP32[d + 20 >> 2] != 0 ? 6 : 5, b == 5 && (HEAP32[a + 44 >> 2] -= 1), c = 0));
  return c
}
_OutputPicture.X = 1;
function _ShellSort(a, b) {
  var c = STACKTOP;
  STACKTOP += 40;
  var d, e, f, g;
  g = 7;
  a:for(;;) {
    if(g == 0) {
      break a
    }
    e = g;
    b:for(;;) {
      if(!(e < b)) {
        break b
      }
      f = c;
      var h, j, l;
      d = a + e * 40;
      h = f;
      j = d + 40;
      if(h % 4 == d % 4) {
        for(;d % 4 !== 0 && d < j;) {
          HEAP8[h++] = HEAP8[d++]
        }
        d >>= 2;
        h >>= 2;
        for(l = j >> 2;d < l;) {
          HEAP32[h++] = HEAP32[d++]
        }
        d <<= 2;
        h <<= 2
      }
      for(;d < j;) {
        HEAP8[h++] = HEAP8[d++]
      }
      f = e;
      c:for(;;) {
        if(f >= g) {
          d = 6
        }else {
          var k = 0;
          d = 7
        }
        d == 6 && (k = _ComparePictures(a + f * 40 + -g * 40, c) > 0);
        if(!k) {
          break c
        }
        d = a + (f - g) * 40;
        h = a + f * 40;
        j = d + 40;
        if(h % 4 == d % 4) {
          for(;d % 4 !== 0 && d < j;) {
            HEAP8[h++] = HEAP8[d++]
          }
          d >>= 2;
          h >>= 2;
          for(l = j >> 2;d < l;) {
            HEAP32[h++] = HEAP32[d++]
          }
          d <<= 2;
          h <<= 2
        }
        for(;d < j;) {
          HEAP8[h++] = HEAP8[d++]
        }
        f -= g
      }
      d = c;
      h = a + f * 40;
      j = d + 40;
      if(h % 4 == d % 4) {
        for(;d % 4 !== 0 && d < j;) {
          HEAP8[h++] = HEAP8[d++]
        }
        d >>= 2;
        h >>= 2;
        for(l = j >> 2;d < l;) {
          HEAP32[h++] = HEAP32[d++]
        }
        d <<= 2;
        h <<= 2
      }
      for(;d < j;) {
        HEAP8[h++] = HEAP8[d++]
      }
      e += 1
    }
    g >>>= 1
  }
  STACKTOP = c
}
_ShellSort.X = 1;
function _h264bsdInitDpb(a, b, c, d, e, f) {
  var g, h;
  HEAP32[a + 36 >> 2] = 65535;
  g = d > 1 ? 1 : 2;
  if(g == 1) {
    var j = d
  }else {
    g == 2 && (j = 1)
  }
  HEAP32[a + 24 >> 2] = j;
  g = f != 0 ? 4 : 5;
  g == 4 ? HEAP32[a + 28 >> 2] = HEAP32[a + 24 >> 2] : g == 5 && (HEAP32[a + 28 >> 2] = c);
  HEAP32[a + 32 >> 2] = e;
  HEAP32[a + 56 >> 2] = f;
  HEAP32[a + 44 >> 2] = 0;
  HEAP32[a + 40 >> 2] = 0;
  HEAP32[a + 48 >> 2] = 0;
  g = _H264SwDecMalloc(680);
  HEAP32[a >> 2] = g;
  g = HEAP32[a >> 2] == 0 ? 7 : 8;
  a:do {
    if(g == 7) {
      h = 65535
    }else {
      if(g == 8) {
        _H264SwDecMemset(HEAP32[a >> 2], 0, 680);
        c = 0;
        b:for(;;) {
          if(!(c < HEAP32[a + 28 >> 2] + 1)) {
            g = 14;
            break b
          }
          d = _H264SwDecMalloc(b * 384 + 47);
          HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2] = d;
          if(HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2] == 0) {
            g = 11;
            break b
          }
          HEAP32[HEAP32[a >> 2] + c * 40 >> 2] = HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2] + Math.floor(16 - HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2] & 15);
          c += 1
        }
        do {
          if(g == 14) {
            h = _H264SwDecMalloc(68);
            HEAP32[a + 4 >> 2] = h;
            h = _H264SwDecMalloc(HEAP32[a + 28 >> 2] + 1 << 4);
            HEAP32[a + 12 >> 2] = h;
            g = HEAP32[a + 4 >> 2] == 0 ? 16 : 15;
            c:do {
              if(g == 15) {
                if(HEAP32[a + 12 >> 2] == 0) {
                  g = 16;
                  break c
                }
                _H264SwDecMemset(HEAP32[a + 4 >> 2], 0, 68);
                HEAP32[a + 20 >> 2] = 0;
                h = HEAP32[a + 16 >> 2] = 0;
                break a
              }
            }while(0);
            h = 65535
          }else {
            g == 11 && (h = 65535)
          }
        }while(0)
      }
    }
  }while(0);
  return h
}
_h264bsdInitDpb.X = 1;
function _h264bsdResetDpb(a, b, c, d, e, f) {
  _h264bsdFreeDpb(a);
  return _h264bsdInitDpb(a, b, c, d, e, f)
}
function _h264bsdFreeDpb(a) {
  var b, c;
  b = HEAP32[a >> 2] != 0 ? 1 : 6;
  do {
    if(b == 1) {
      c = 0;
      b:for(;;) {
        if(!(c < HEAP32[a + 28 >> 2] + 1)) {
          b = 5;
          break b
        }
        _H264SwDecFree(HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2]);
        HEAP32[HEAP32[a >> 2] + c * 40 + 4 >> 2] = 0;
        c += 1
      }
    }
  }while(0);
  _H264SwDecFree(HEAP32[a >> 2]);
  HEAP32[a >> 2] = 0;
  _H264SwDecFree(HEAP32[a + 4 >> 2]);
  HEAP32[a + 4 >> 2] = 0;
  _H264SwDecFree(HEAP32[a + 12 >> 2]);
  HEAP32[a + 12 >> 2] = 0
}
_h264bsdFreeDpb.X = 1;
function _h264bsdInitRefPicList(a) {
  var b;
  b = 0;
  a:for(;;) {
    if(!(b < HEAPU32[a + 40 >> 2])) {
      break a
    }
    HEAP32[HEAP32[a + 4 >> 2] + (b << 2) >> 2] = HEAP32[a >> 2] + b * 40;
    b += 1
  }
}
function _h264bsdDpbOutputPicture(a) {
  var b, c;
  b = HEAPU32[a + 20 >> 2] < HEAPU32[a + 16 >> 2] ? 1 : 2;
  b == 1 ? (b = HEAP32[a + 12 >> 2], c = HEAP32[a + 20 >> 2], HEAP32[a + 20 >> 2] = c + 1, c = b + (c << 4)) : b == 2 && (c = 0);
  return c
}
function _ComparePictures(a, b) {
  var c, d;
  c = HEAP32[a + 20 >> 2] != 0 ? 9 : 1;
  a:do {
    if(c == 1) {
      if(HEAP32[b + 20 >> 2] != 0) {
        c = 9;
        break a
      }
      c = HEAP32[a + 24 >> 2] != 0 ? 3 : 5;
      b:do {
        if(c == 3) {
          if(HEAP32[b + 24 >> 2] != 0) {
            break b
          }
          d = -1;
          c = 33;
          break a
        }
      }while(0);
      c = HEAP32[a + 24 >> 2] != 0 ? 8 : 6;
      b:do {
        if(c == 6) {
          if(HEAP32[b + 24 >> 2] == 0) {
            break b
          }
          d = 1;
          c = 33;
          break a
        }
      }while(0);
      d = 0;
      c = 33;
      break a
    }
  }while(0);
  a:do {
    if(c == 9) {
      c = HEAP32[b + 20 >> 2] != 0 ? 11 : 10;
      do {
        if(c == 11) {
          c = HEAP32[a + 20 >> 2] != 0 ? 13 : 12;
          do {
            if(c == 13) {
              c = HEAP32[a + 20 >> 2] == 1 ? 15 : 14;
              d:do {
                if(c == 14) {
                  c = HEAP32[a + 20 >> 2] == 2 ? 15 : 22;
                  break d
                }
              }while(0);
              d:do {
                if(c == 15) {
                  c = HEAP32[b + 20 >> 2] == 1 ? 17 : 16;
                  do {
                    if(c == 16 && HEAP32[b + 20 >> 2] != 2) {
                      break d
                    }
                  }while(0);
                  c = HEAP32[a + 8 >> 2] > HEAP32[b + 8 >> 2] ? 18 : 19;
                  do {
                    if(c == 18) {
                      d = -1;
                      break a
                    }else {
                      if(c == 19) {
                        c = HEAP32[a + 8 >> 2] < HEAP32[b + 8 >> 2] ? 20 : 21;
                        do {
                          if(c == 20) {
                            d = 1;
                            break a
                          }else {
                            if(c == 21) {
                              d = 0;
                              break a
                            }
                          }
                        }while(0)
                      }
                    }
                  }while(0)
                }
              }while(0);
              c = HEAP32[a + 20 >> 2] == 1 ? 24 : 23;
              d:do {
                if(c == 23) {
                  if(HEAP32[a + 20 >> 2] == 2) {
                    c = 24;
                    break d
                  }
                  c = HEAP32[b + 20 >> 2] == 1 ? 27 : 26;
                  e:do {
                    if(c == 26) {
                      if(HEAP32[b + 20 >> 2] == 2) {
                        break e
                      }
                      c = HEAP32[a + 8 >> 2] > HEAP32[b + 8 >> 2] ? 29 : 30;
                      do {
                        if(c == 29) {
                          d = 1;
                          break a
                        }else {
                          if(c == 30) {
                            c = HEAP32[a + 8 >> 2] < HEAP32[b + 8 >> 2] ? 31 : 32;
                            do {
                              if(c == 31) {
                                d = -1;
                                break a
                              }else {
                                if(c == 32) {
                                  d = 0;
                                  break a
                                }
                              }
                            }while(0)
                          }
                        }
                      }while(0)
                    }
                  }while(0);
                  d = 1;
                  break a
                }
              }while(0);
              d = -1
            }else {
              c == 12 && (d = 1)
            }
          }while(0)
        }else {
          c == 10 && (d = -1)
        }
      }while(0)
    }
  }while(0);
  return d
}
_ComparePictures.X = 1;
function _FindSmallestPicOrderCnt(a) {
  var b, c, d, e;
  d = 2147483647;
  c = e = 0;
  a:for(;;) {
    if(!(c <= HEAPU32[a + 28 >> 2])) {
      break a
    }
    b = HEAP32[HEAP32[a >> 2] + c * 40 + 24 >> 2] != 0 ? 3 : 5;
    b:do {
      if(b == 3) {
        if(!(HEAP32[HEAP32[a >> 2] + c * 40 + 16 >> 2] < d)) {
          break b
        }
        e = HEAP32[a >> 2] + c * 40;
        d = HEAP32[HEAP32[a >> 2] + c * 40 + 16 >> 2]
      }
    }while(0);
    c += 1
  }
  return e
}
_FindSmallestPicOrderCnt.X = 1;
function _h264bsdCheckGapsInFrameNum(a, b, c, d) {
  var e, f;
  HEAP32[a + 16 >> 2] = 0;
  HEAP32[a + 20 >> 2] = 0;
  d = d != 0 ? 2 : 1;
  a:do {
    if(d == 2) {
      d = b != HEAP32[a + 48 >> 2] ? 3 : 27;
      b:do {
        if(d == 3) {
          if(b == (HEAP32[a + 48 >> 2] + 1) % HEAPU32[a + 32 >> 2]) {
            d = 27;
            break b
          }
          f = (HEAP32[a + 48 >> 2] + 1) % HEAPU32[a + 32 >> 2];
          e = HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 >> 2];
          c:for(;;) {
            _SetPicNums(a, f);
            if(_SlidingWindowRefPicMarking(a) != 0) {
              d = 6;
              break c
            }
            d:for(;;) {
              if(!(HEAPU32[a + 44 >> 2] >= HEAPU32[a + 28 >> 2])) {
                d = 10;
                break d
              }
              _OutputPicture(a)
            }
            HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 + 20 >> 2] = 1;
            HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 + 12 >> 2] = f;
            HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 + 8 >> 2] = f;
            HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 + 16 >> 2] = 0;
            HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 + 24 >> 2] = 0;
            HEAP32[a + 44 >> 2] += 1;
            HEAP32[a + 40 >> 2] += 1;
            _ShellSort(HEAP32[a >> 2], HEAP32[a + 28 >> 2] + 1);
            f = (f + 1) % HEAPU32[a + 32 >> 2];
            if(f == b) {
              d = 12;
              break c
            }
          }
          do {
            if(d == 6) {
              e = 1;
              break a
            }else {
              if(d == 12) {
                d = HEAP32[a + 16 >> 2] != 0 ? 13 : 26;
                do {
                  if(d == 13) {
                    f = 0;
                    e:for(;;) {
                      if(!(f < HEAPU32[a + 16 >> 2])) {
                        d = 25;
                        break e
                      }
                      if(HEAP32[HEAP32[a + 12 >> 2] + (f << 4) >> 2] == HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 >> 2]) {
                        d = 16;
                        break e
                      }
                      f += 1
                    }
                    do {
                      if(d == 16) {
                        f = 0;
                        f:for(;;) {
                          if(!(f < HEAPU32[a + 28 >> 2])) {
                            d = 22;
                            break f
                          }
                          if(HEAP32[HEAP32[a >> 2] + f * 40 >> 2] == e) {
                            d = 19;
                            break f
                          }
                          f += 1
                        }
                        d == 19 && (HEAP32[HEAP32[a >> 2] + f * 40 >> 2] = HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 >> 2], HEAP32[HEAP32[a >> 2] + HEAP32[a + 28 >> 2] * 40 >> 2] = e)
                      }
                    }while(0)
                  }
                }while(0);
                d = 31;
                break b
              }
            }
          }while(0)
        }
      }while(0);
      do {
        if(d == 27) {
          d = c != 0 ? 28 : 30;
          c:do {
            if(d == 28) {
              if(b != HEAP32[a + 48 >> 2]) {
                d = 30;
                break c
              }
              e = 1;
              break a
            }
          }while(0)
        }
      }while(0);
      d = c != 0 ? 32 : 33;
      d == 32 ? HEAP32[a + 48 >> 2] = b : d == 33 && (d = b != HEAP32[a + 48 >> 2] ? 34 : 35, d == 34 && (HEAP32[a + 48 >> 2] = (b + HEAP32[a + 32 >> 2] - 1) % HEAPU32[a + 32 >> 2]));
      e = 0
    }else {
      d == 1 && (e = 0)
    }
  }while(0);
  return e
}
_h264bsdCheckGapsInFrameNum.X = 1;
function _h264bsdFlushDpb(a) {
  var b;
  b = HEAP32[a >> 2] != 0 ? 1 : 5;
  do {
    if(b == 1) {
      HEAP32[a + 60 >> 2] = 1;
      b:for(;;) {
        if(_OutputPicture(a) != 0) {
          b = 4;
          break b
        }
      }
    }
  }while(0)
}
function _h264bsdWriteMacroblock(a, b) {
  var c, d, e, f, g, h, j, l;
  d = HEAP32[a + 4 >> 2];
  e = HEAP32[a + 12 >> 2];
  f = HEAP32[a + 16 >> 2];
  g = HEAP32[a + 20 >> 2];
  h = b;
  d <<= 2;
  c = 16;
  a:for(;;) {
    if(c == 0) {
      break a
    }
    j = h;
    h = j + 4;
    j = HEAP32[j >> 2];
    l = h;
    h = l + 4;
    l = HEAP32[l >> 2];
    var k = e;
    e = k + 4;
    HEAP32[k >> 2] = j;
    j = e;
    e = j + 4;
    HEAP32[j >> 2] = l;
    j = h;
    h = j + 4;
    j = HEAP32[j >> 2];
    l = h;
    h = l + 4;
    l = HEAP32[l >> 2];
    k = e;
    e = k + 4;
    HEAP32[k >> 2] = j;
    j = e;
    e = j + 4;
    HEAP32[j >> 2] = l;
    e += d - 4 << 2;
    c -= 1
  }
  d >>>= 1;
  c = 8;
  a:for(;;) {
    if(c == 0) {
      break a
    }
    e = h;
    h = e + 4;
    j = HEAP32[e >> 2];
    e = h;
    h = e + 4;
    l = HEAP32[e >> 2];
    e = f;
    f = e + 4;
    HEAP32[e >> 2] = j;
    e = f;
    f = e + 4;
    HEAP32[e >> 2] = l;
    f += d - 2 << 2;
    c -= 1
  }
  c = 8;
  a:for(;;) {
    if(c == 0) {
      break a
    }
    f = h;
    h = f + 4;
    j = HEAP32[f >> 2];
    f = h;
    h = f + 4;
    l = HEAP32[f >> 2];
    f = g;
    g = f + 4;
    HEAP32[f >> 2] = j;
    f = g;
    g = f + 4;
    HEAP32[f >> 2] = l;
    g += d - 2 << 2;
    c -= 1
  }
}
_h264bsdWriteMacroblock.X = 1;
function _h264bsdWriteOutputBlocks(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n, q, p, o;
  o = _h264bsdClip + 512;
  g = HEAP32[a + 4 >> 2];
  e = g * HEAP32[a + 8 >> 2];
  j = Math.floor(b / g);
  b %= g;
  h = HEAP32[a >> 2] + (j * g << 8) + (b << 4);
  a = HEAP32[a >> 2] + (e << 8) + (j * g << 6) + (b << 3);
  j = a + (e << 6);
  g <<= 4;
  k = 0;
  a:for(;;) {
    if(!(k < 16)) {
      break a
    }
    m = HEAP32[_h264bsdBlockX + (k << 2) >> 2];
    f = HEAP32[_h264bsdBlockY + (k << 2) >> 2];
    n = d + (k << 6);
    l = c + (f << 4) + m;
    b = h + f * g + m;
    e = HEAP32[n >> 2] == 16777215 ? 3 : 4;
    do {
      if(e == 3) {
        f = l, p = b, m = HEAP32[f >> 2], f += 16, q = HEAP32[f >> 2], f += 16, HEAP32[p >> 2] = m, p += Math.floor(g / 4) << 2, HEAP32[p >> 2] = q, p += Math.floor(g / 4) << 2, m = HEAP32[f >> 2], f += 16, q = HEAP32[f >> 2], HEAP32[p >> 2] = m, p += Math.floor(g / 4) << 2, HEAP32[p >> 2] = q
      }else {
        if(e == 4) {
          f = 4;
          c:for(;;) {
            if(f == 0) {
              e = 8;
              break c
            }
            m = HEAPU8[l];
            p = n;
            n = p + 4;
            q = HEAP32[p >> 2];
            p = HEAPU8[l + 1];
            m = HEAPU8[o + (m + q)];
            q = n;
            n = q + 4;
            q = HEAP32[q >> 2];
            HEAP8[b] = m & 255;
            p = HEAPU8[o + (p + q)];
            m = HEAPU8[l + 2];
            q = n;
            n = q + 4;
            q = HEAP32[q >> 2];
            HEAP8[b + 1] = p & 255;
            m = HEAPU8[o + (m + q)];
            p = HEAPU8[l + 3];
            q = n;
            n = q + 4;
            q = HEAP32[q >> 2];
            HEAP8[b + 2] = m & 255;
            p = HEAPU8[o + (p + q)];
            l += 16;
            HEAP8[b + 3] = p & 255;
            b += g;
            f -= 1
          }
        }
      }
    }while(0);
    k += 1
  }
  g = Math.floor(g / 2);
  k = 16;
  a:for(;;) {
    if(!(k <= 23)) {
      break a
    }
    m = HEAP32[_h264bsdBlockX + ((k & 3) << 2) >> 2];
    f = HEAP32[_h264bsdBlockY + ((k & 3) << 2) >> 2];
    n = d + (k << 6);
    l = c + 256;
    b = a;
    e = k >= 20 ? 14 : 15;
    e == 14 && (b = j, l += 64);
    l += (f << 3) + m;
    b += f * g + m;
    e = HEAP32[n >> 2] == 16777215 ? 16 : 17;
    do {
      if(e == 16) {
        h = l, f = b, m = HEAP32[h >> 2], h += 8, q = HEAP32[h >> 2], h += 8, HEAP32[f >> 2] = m, f += Math.floor(g / 4) << 2, HEAP32[f >> 2] = q, f += Math.floor(g / 4) << 2, m = HEAP32[h >> 2], h += 8, q = HEAP32[h >> 2], HEAP32[f >> 2] = m, f += Math.floor(g / 4) << 2, HEAP32[f >> 2] = q
      }else {
        if(e == 17) {
          f = 4;
          c:for(;;) {
            if(f == 0) {
              e = 21;
              break c
            }
            m = HEAPU8[l];
            h = n;
            n = h + 4;
            q = HEAP32[h >> 2];
            p = HEAPU8[l + 1];
            m = HEAPU8[o + (m + q)];
            h = n;
            n = h + 4;
            q = HEAP32[h >> 2];
            HEAP8[b] = m & 255;
            p = HEAPU8[o + (p + q)];
            m = HEAPU8[l + 2];
            h = n;
            n = h + 4;
            q = HEAP32[h >> 2];
            HEAP8[b + 1] = p & 255;
            m = HEAPU8[o + (m + q)];
            p = HEAPU8[l + 3];
            h = n;
            n = h + 4;
            q = HEAP32[h >> 2];
            HEAP8[b + 2] = m & 255;
            p = HEAPU8[o + (p + q)];
            l += 8;
            HEAP8[b + 3] = p & 255;
            b += g;
            f -= 1
          }
        }
      }
    }while(0);
    k += 1
  }
}
_h264bsdWriteOutputBlocks.X = 1;
function _InnerBoundaryStrength2(a, b, c) {
  var d, e, f, g, h;
  d = HEAP16[a + 132 + (b << 2) >> 1];
  f = HEAP16[a + 132 + (c << 2) >> 1];
  g = HEAP16[a + 132 + (b << 2) + 2 >> 1];
  h = HEAP16[a + 132 + (c << 2) + 2 >> 1];
  d = _abs(d - f) >= 4 ? 3 : 1;
  a:do {
    if(d == 1) {
      if(_abs(g - h) >= 4) {
        d = 3;
        break a
      }
      if(HEAP32[a + 116 + (b >>> 2 << 2) >> 2] != HEAP32[a + 116 + (c >>> 2 << 2) >> 2]) {
        d = 3;
        break a
      }
      e = 0;
      d = 5;
      break a
    }
  }while(0);
  d == 3 && (e = 1);
  return e
}
_InnerBoundaryStrength2.X = 1;
function _h264bsdFilterPicture(a, b) {
  var c = STACKTOP;
  STACKTOP += 164;
  var d, e, f, g, h, j, l, k = c + 128;
  j = HEAP32[a + 4 >> 2];
  f = j * HEAP32[a + 8 >> 2];
  l = b;
  h = g = 0;
  a:for(;;) {
    if(!(g < HEAPU32[a + 8 >> 2])) {
      break a
    }
    e = _GetMbFilteringFlags(l);
    d = e != 0 ? 3 : 6;
    d == 3 && (d = _GetBoundaryStrengths(l, c, e) != 0 ? 4 : 5, d == 4 && (_GetLumaEdgeThresholds(k, l, e), d = HEAP32[a >> 2] + (g * j << 8) + (h << 4), _FilterLuma(d, c, k, j << 4), _GetChromaEdgeThresholds(k, l, e, HEAP32[l + 24 >> 2]), d = HEAP32[a >> 2] + (f << 8) + (g * j << 6) + (h << 3), _FilterChroma(d, d + (f << 6), c, k, j << 3)));
    h += 1;
    d = h == j ? 7 : 8;
    d == 7 && (h = 0, g += 1);
    l += 216
  }
  STACKTOP = c
}
_h264bsdFilterPicture.X = 1;
function _GetMbFilteringFlags(a) {
  var b, c;
  c = 0;
  b = HEAP32[a + 8 >> 2] != 1 ? 1 : 10;
  do {
    if(b == 1) {
      c |= 1;
      b = HEAP32[a + 200 >> 2] != 0 ? 2 : 5;
      b:do {
        if(b == 2) {
          b = HEAP32[a + 8 >> 2] != 2 ? 4 : 3;
          do {
            if(b == 3 && _IsSliceBoundaryOnLeft(a) != 0) {
              break b
            }
          }while(0);
          c |= 4
        }
      }while(0);
      b = HEAP32[a + 204 >> 2] != 0 ? 6 : 9;
      b:do {
        if(b == 6) {
          b = HEAP32[a + 8 >> 2] != 2 ? 8 : 7;
          do {
            if(b == 7 && _IsSliceBoundaryOnTop(a) != 0) {
              b = 9;
              break b
            }
          }while(0);
          c |= 2
        }
      }while(0)
    }
  }while(0);
  return c
}
_GetMbFilteringFlags.X = 1;
function _GetBoundaryStrengths(a, b, c) {
  var d, e;
  e = 0;
  d = (c & 2) != 0 ? 1 : 11;
  do {
    if(d == 1) {
      d = HEAPU32[a >> 2] > 5 ? 3 : 2;
      b:do {
        if(d == 2) {
          if(HEAPU32[HEAP32[a + 204 >> 2] >> 2] > 5) {
            d = 3;
            break b
          }
          d = _EdgeBoundaryStrength(a, HEAP32[a + 204 >> 2], 0, 10);
          HEAP32[b >> 2] = d;
          d = _EdgeBoundaryStrength(a, HEAP32[a + 204 >> 2], 1, 11);
          HEAP32[b + 8 >> 2] = d;
          d = _EdgeBoundaryStrength(a, HEAP32[a + 204 >> 2], 4, 14);
          HEAP32[b + 16 >> 2] = d;
          d = _EdgeBoundaryStrength(a, HEAP32[a + 204 >> 2], 5, 15);
          HEAP32[b + 24 >> 2] = d;
          d = HEAP32[b >> 2] != 0 ? 8 : 5;
          c:do {
            if(d == 5) {
              if(HEAP32[b + 8 >> 2] != 0) {
                d = 8;
                break c
              }
              if(HEAP32[b + 16 >> 2] != 0) {
                d = 8;
                break c
              }
              d = HEAP32[b + 24 >> 2] != 0 ? 8 : 9;
              break c
            }
          }while(0);
          d == 8 && (e = 1);
          d = 10;
          break b
        }
      }while(0);
      d == 3 && (HEAP32[b + 24 >> 2] = 4, HEAP32[b + 16 >> 2] = 4, HEAP32[b + 8 >> 2] = 4, HEAP32[b >> 2] = 4, e = 1)
    }else {
      d == 11 && (HEAP32[b + 24 >> 2] = 0, HEAP32[b + 16 >> 2] = 0, HEAP32[b + 8 >> 2] = 0, HEAP32[b >> 2] = 0)
    }
  }while(0);
  d = (c & 4) != 0 ? 13 : 24;
  do {
    if(d == 13) {
      d = HEAPU32[a >> 2] > 5 ? 15 : 14;
      b:do {
        if(d == 14) {
          if(HEAPU32[HEAP32[a + 200 >> 2] >> 2] > 5) {
            d = 15;
            break b
          }
          c = _EdgeBoundaryStrength(a, HEAP32[a + 200 >> 2], 0, 5);
          HEAP32[b + 4 >> 2] = c;
          c = _EdgeBoundaryStrength(a, HEAP32[a + 200 >> 2], 2, 7);
          HEAP32[b + 36 >> 2] = c;
          c = _EdgeBoundaryStrength(a, HEAP32[a + 200 >> 2], 8, 13);
          HEAP32[b + 68 >> 2] = c;
          c = _EdgeBoundaryStrength(a, HEAP32[a + 200 >> 2], 10, 15);
          HEAP32[b + 100 >> 2] = c;
          d = e != 0 ? 22 : 17;
          c:do {
            if(d == 17) {
              d = HEAP32[b + 4 >> 2] != 0 ? 21 : 18;
              d:do {
                if(d == 18) {
                  if(HEAP32[b + 36 >> 2] != 0) {
                    d = 21;
                    break d
                  }
                  if(HEAP32[b + 68 >> 2] != 0) {
                    d = 21;
                    break d
                  }
                  if(HEAP32[b + 100 >> 2] == 0) {
                    break c
                  }
                }
              }while(0);
              e = 1
            }
          }while(0);
          d = 23;
          break b
        }
      }while(0);
      d == 15 && (HEAP32[b + 100 >> 2] = 4, HEAP32[b + 68 >> 2] = 4, HEAP32[b + 36 >> 2] = 4, HEAP32[b + 4 >> 2] = 4, e = 1)
    }else {
      d == 24 && (HEAP32[b + 100 >> 2] = 0, HEAP32[b + 68 >> 2] = 0, HEAP32[b + 36 >> 2] = 0, HEAP32[b + 4 >> 2] = 0)
    }
  }while(0);
  d = HEAPU32[a >> 2] > 5 ? 26 : 27;
  do {
    if(d == 26) {
      HEAP32[b + 120 >> 2] = 3, HEAP32[b + 112 >> 2] = 3, HEAP32[b + 104 >> 2] = 3, HEAP32[b + 96 >> 2] = 3, HEAP32[b + 88 >> 2] = 3, HEAP32[b + 80 >> 2] = 3, HEAP32[b + 72 >> 2] = 3, HEAP32[b + 64 >> 2] = 3, HEAP32[b + 56 >> 2] = 3, HEAP32[b + 48 >> 2] = 3, HEAP32[b + 40 >> 2] = 3, HEAP32[b + 32 >> 2] = 3, HEAP32[b + 124 >> 2] = 3, HEAP32[b + 116 >> 2] = 3, HEAP32[b + 108 >> 2] = 3, HEAP32[b + 92 >> 2] = 3, HEAP32[b + 84 >> 2] = 3, HEAP32[b + 76 >> 2] = 3, HEAP32[b + 60 >> 2] = 3, HEAP32[b + 52 >> 
      2] = 3, HEAP32[b + 44 >> 2] = 3, HEAP32[b + 28 >> 2] = 3, HEAP32[b + 20 >> 2] = 3, HEAP32[b + 12 >> 2] = 3, e = 1
    }else {
      if(d == 27) {
        d = _h264bsdNumMbPart(HEAP32[a >> 2]) == 1 ? 28 : 29;
        if(d == 28) {
          _GetBoundaryStrengthsA(a, b)
        }else {
          if(d == 29) {
            if(d = HEAP32[a >> 2] == 2 ? 30 : 71, d == 30) {
              if(HEAP16[a + 32 >> 1] != 0) {
                var f = 1;
                d = 32
              }else {
                d = 31
              }
              d == 31 && (f = HEAP16[a + 28 >> 1] != 0);
              HEAP32[b + 32 >> 2] = f ? 2 : 0;
              if(HEAP16[a + 34 >> 1] != 0) {
                var g = 1;
                d = 34
              }else {
                d = 33
              }
              d == 33 && (g = HEAP16[a + 30 >> 1] != 0);
              HEAP32[b + 40 >> 2] = g ? 2 : 0;
              if(HEAP16[a + 40 >> 1] != 0) {
                var h = 1;
                d = 36
              }else {
                d = 35
              }
              d == 35 && (h = HEAP16[a + 36 >> 1] != 0);
              HEAP32[b + 48 >> 2] = h ? 2 : 0;
              if(HEAP16[a + 42 >> 1] != 0) {
                var j = 1;
                d = 38
              }else {
                d = 37
              }
              d == 37 && (j = HEAP16[a + 38 >> 1] != 0);
              HEAP32[b + 56 >> 2] = j ? 2 : 0;
              if(HEAP16[a + 48 >> 1] != 0) {
                var l = 1;
                d = 40
              }else {
                d = 39
              }
              d == 39 && (l = HEAP16[a + 44 >> 1] != 0);
              HEAP32[b + 96 >> 2] = l ? 2 : 0;
              if(HEAP16[a + 50 >> 1] != 0) {
                var k = 1;
                d = 42
              }else {
                d = 41
              }
              d == 41 && (k = HEAP16[a + 46 >> 1] != 0);
              HEAP32[b + 104 >> 2] = k ? 2 : 0;
              if(HEAP16[a + 56 >> 1] != 0) {
                var m = 1;
                d = 44
              }else {
                d = 43
              }
              d == 43 && (m = HEAP16[a + 52 >> 1] != 0);
              HEAP32[b + 112 >> 2] = m ? 2 : 0;
              if(HEAP16[a + 58 >> 1] != 0) {
                var n = 1;
                d = 46
              }else {
                d = 45
              }
              d == 45 && (n = HEAP16[a + 54 >> 1] != 0);
              HEAP32[b + 120 >> 2] = n ? 2 : 0;
              c = _InnerBoundaryStrength(a, 8, 2);
              HEAP32[b + 64 >> 2] = c;
              c = _InnerBoundaryStrength(a, 9, 3);
              HEAP32[b + 72 >> 2] = c;
              c = _InnerBoundaryStrength(a, 12, 6);
              HEAP32[b + 80 >> 2] = c;
              c = _InnerBoundaryStrength(a, 13, 7);
              HEAP32[b + 88 >> 2] = c;
              if(HEAP16[a + 30 >> 1] != 0) {
                var q = 1;
                d = 48
              }else {
                d = 47
              }
              d == 47 && (q = HEAP16[a + 28 >> 1] != 0);
              HEAP32[b + 12 >> 2] = q ? 2 : 0;
              if(HEAP16[a + 36 >> 1] != 0) {
                var p = 1;
                d = 50
              }else {
                d = 49
              }
              d == 49 && (p = HEAP16[a + 30 >> 1] != 0);
              HEAP32[b + 20 >> 2] = p ? 2 : 0;
              if(HEAP16[a + 38 >> 1] != 0) {
                var o = 1;
                d = 52
              }else {
                d = 51
              }
              d == 51 && (o = HEAP16[a + 36 >> 1] != 0);
              HEAP32[b + 28 >> 2] = o ? 2 : 0;
              if(HEAP16[a + 34 >> 1] != 0) {
                var r = 1;
                d = 54
              }else {
                d = 53
              }
              d == 53 && (r = HEAP16[a + 32 >> 1] != 0);
              HEAP32[b + 44 >> 2] = r ? 2 : 0;
              if(HEAP16[a + 40 >> 1] != 0) {
                var s = 1;
                d = 56
              }else {
                d = 55
              }
              d == 55 && (s = HEAP16[a + 34 >> 1] != 0);
              HEAP32[b + 52 >> 2] = s ? 2 : 0;
              if(HEAP16[a + 42 >> 1] != 0) {
                var t = 1;
                d = 58
              }else {
                d = 57
              }
              d == 57 && (t = HEAP16[a + 40 >> 1] != 0);
              HEAP32[b + 60 >> 2] = t ? 2 : 0;
              if(HEAP16[a + 46 >> 1] != 0) {
                var u = 1;
                d = 60
              }else {
                d = 59
              }
              d == 59 && (u = HEAP16[a + 44 >> 1] != 0);
              HEAP32[b + 76 >> 2] = u ? 2 : 0;
              if(HEAP16[a + 52 >> 1] != 0) {
                var v = 1;
                d = 62
              }else {
                d = 61
              }
              d == 61 && (v = HEAP16[a + 46 >> 1] != 0);
              HEAP32[b + 84 >> 2] = v ? 2 : 0;
              if(HEAP16[a + 54 >> 1] != 0) {
                var w = 1;
                d = 64
              }else {
                d = 63
              }
              d == 63 && (w = HEAP16[a + 52 >> 1] != 0);
              HEAP32[b + 92 >> 2] = w ? 2 : 0;
              if(HEAP16[a + 50 >> 1] != 0) {
                var x = 1;
                d = 66
              }else {
                d = 65
              }
              d == 65 && (x = HEAP16[a + 48 >> 1] != 0);
              HEAP32[b + 108 >> 2] = x ? 2 : 0;
              if(HEAP16[a + 56 >> 1] != 0) {
                var z = 1;
                d = 68
              }else {
                d = 67
              }
              d == 67 && (z = HEAP16[a + 50 >> 1] != 0);
              HEAP32[b + 116 >> 2] = z ? 2 : 0;
              if(HEAP16[a + 58 >> 1] != 0) {
                var A = 1;
                d = 70
              }else {
                d = 69
              }
              d == 69 && (A = HEAP16[a + 56 >> 1] != 0);
              HEAP32[b + 124 >> 2] = A ? 2 : 0
            }else {
              if(d == 71) {
                if(d = HEAP32[a >> 2] == 3 ? 72 : 113, d == 72) {
                  if(HEAP16[a + 32 >> 1] != 0) {
                    var y = 1;
                    d = 74
                  }else {
                    d = 73
                  }
                  d == 73 && (y = HEAP16[a + 28 >> 1] != 0);
                  HEAP32[b + 32 >> 2] = y ? 2 : 0;
                  if(HEAP16[a + 34 >> 1] != 0) {
                    var B = 1;
                    d = 76
                  }else {
                    d = 75
                  }
                  d == 75 && (B = HEAP16[a + 30 >> 1] != 0);
                  HEAP32[b + 40 >> 2] = B ? 2 : 0;
                  if(HEAP16[a + 40 >> 1] != 0) {
                    var C = 1;
                    d = 78
                  }else {
                    d = 77
                  }
                  d == 77 && (C = HEAP16[a + 36 >> 1] != 0);
                  HEAP32[b + 48 >> 2] = C ? 2 : 0;
                  if(HEAP16[a + 42 >> 1] != 0) {
                    var D = 1;
                    d = 80
                  }else {
                    d = 79
                  }
                  d == 79 && (D = HEAP16[a + 38 >> 1] != 0);
                  HEAP32[b + 56 >> 2] = D ? 2 : 0;
                  if(HEAP16[a + 44 >> 1] != 0) {
                    var E = 1;
                    d = 82
                  }else {
                    d = 81
                  }
                  d == 81 && (E = HEAP16[a + 32 >> 1] != 0);
                  HEAP32[b + 64 >> 2] = E ? 2 : 0;
                  if(HEAP16[a + 46 >> 1] != 0) {
                    var F = 1;
                    d = 84
                  }else {
                    d = 83
                  }
                  d == 83 && (F = HEAP16[a + 34 >> 1] != 0);
                  HEAP32[b + 72 >> 2] = F ? 2 : 0;
                  if(HEAP16[a + 52 >> 1] != 0) {
                    var G = 1;
                    d = 86
                  }else {
                    d = 85
                  }
                  d == 85 && (G = HEAP16[a + 40 >> 1] != 0);
                  HEAP32[b + 80 >> 2] = G ? 2 : 0;
                  if(HEAP16[a + 54 >> 1] != 0) {
                    var H = 1;
                    d = 88
                  }else {
                    d = 87
                  }
                  d == 87 && (H = HEAP16[a + 42 >> 1] != 0);
                  HEAP32[b + 88 >> 2] = H ? 2 : 0;
                  if(HEAP16[a + 48 >> 1] != 0) {
                    var I = 1;
                    d = 90
                  }else {
                    d = 89
                  }
                  d == 89 && (I = HEAP16[a + 44 >> 1] != 0);
                  HEAP32[b + 96 >> 2] = I ? 2 : 0;
                  if(HEAP16[a + 50 >> 1] != 0) {
                    var J = 1;
                    d = 92
                  }else {
                    d = 91
                  }
                  d == 91 && (J = HEAP16[a + 46 >> 1] != 0);
                  HEAP32[b + 104 >> 2] = J ? 2 : 0;
                  if(HEAP16[a + 56 >> 1] != 0) {
                    var K = 1;
                    d = 94
                  }else {
                    d = 93
                  }
                  d == 93 && (K = HEAP16[a + 52 >> 1] != 0);
                  HEAP32[b + 112 >> 2] = K ? 2 : 0;
                  if(HEAP16[a + 58 >> 1] != 0) {
                    var L = 1;
                    d = 96
                  }else {
                    d = 95
                  }
                  d == 95 && (L = HEAP16[a + 54 >> 1] != 0);
                  HEAP32[b + 120 >> 2] = L ? 2 : 0;
                  if(HEAP16[a + 30 >> 1] != 0) {
                    var M = 1;
                    d = 98
                  }else {
                    d = 97
                  }
                  d == 97 && (M = HEAP16[a + 28 >> 1] != 0);
                  HEAP32[b + 12 >> 2] = M ? 2 : 0;
                  if(HEAP16[a + 38 >> 1] != 0) {
                    var N = 1;
                    d = 100
                  }else {
                    d = 99
                  }
                  d == 99 && (N = HEAP16[a + 36 >> 1] != 0);
                  HEAP32[b + 28 >> 2] = N ? 2 : 0;
                  if(HEAP16[a + 34 >> 1] != 0) {
                    var O = 1;
                    d = 102
                  }else {
                    d = 101
                  }
                  d == 101 && (O = HEAP16[a + 32 >> 1] != 0);
                  HEAP32[b + 44 >> 2] = O ? 2 : 0;
                  if(HEAP16[a + 42 >> 1] != 0) {
                    var P = 1;
                    d = 104
                  }else {
                    d = 103
                  }
                  d == 103 && (P = HEAP16[a + 40 >> 1] != 0);
                  HEAP32[b + 60 >> 2] = P ? 2 : 0;
                  if(HEAP16[a + 46 >> 1] != 0) {
                    var Q = 1;
                    d = 106
                  }else {
                    d = 105
                  }
                  d == 105 && (Q = HEAP16[a + 44 >> 1] != 0);
                  HEAP32[b + 76 >> 2] = Q ? 2 : 0;
                  if(HEAP16[a + 54 >> 1] != 0) {
                    var R = 1;
                    d = 108
                  }else {
                    d = 107
                  }
                  d == 107 && (R = HEAP16[a + 52 >> 1] != 0);
                  HEAP32[b + 92 >> 2] = R ? 2 : 0;
                  if(HEAP16[a + 50 >> 1] != 0) {
                    var S = 1;
                    d = 110
                  }else {
                    d = 109
                  }
                  d == 109 && (S = HEAP16[a + 48 >> 1] != 0);
                  HEAP32[b + 108 >> 2] = S ? 2 : 0;
                  if(HEAP16[a + 58 >> 1] != 0) {
                    var T = 1;
                    d = 112
                  }else {
                    d = 111
                  }
                  d == 111 && (T = HEAP16[a + 56 >> 1] != 0);
                  HEAP32[b + 124 >> 2] = T ? 2 : 0;
                  c = _InnerBoundaryStrength(a, 4, 1);
                  HEAP32[b + 20 >> 2] = c;
                  c = _InnerBoundaryStrength(a, 6, 3);
                  HEAP32[b + 52 >> 2] = c;
                  c = _InnerBoundaryStrength(a, 12, 9);
                  HEAP32[b + 84 >> 2] = c;
                  c = _InnerBoundaryStrength(a, 14, 11);
                  HEAP32[b + 116 >> 2] = c
                }else {
                  d == 113 && (c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 16 >> 2], HEAP32[_mb4x4Index >> 2]), HEAP32[b + 32 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 20 >> 2], HEAP32[_mb4x4Index + 4 >> 2]), HEAP32[b + 40 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 24 >> 2], HEAP32[_mb4x4Index + 8 >> 2]), HEAP32[b + 48 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 28 >> 2], HEAP32[_mb4x4Index + 12 >> 2]), HEAP32[b + 56 >> 2] = c, c = _InnerBoundaryStrength(a, 
                  HEAP32[_mb4x4Index + 32 >> 2], HEAP32[_mb4x4Index + 16 >> 2]), HEAP32[b + 64 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 36 >> 2], HEAP32[_mb4x4Index + 20 >> 2]), HEAP32[b + 72 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 40 >> 2], HEAP32[_mb4x4Index + 24 >> 2]), HEAP32[b + 80 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 44 >> 2], HEAP32[_mb4x4Index + 28 >> 2]), HEAP32[b + 88 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 
                  48 >> 2], HEAP32[_mb4x4Index + 32 >> 2]), HEAP32[b + 96 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 52 >> 2], HEAP32[_mb4x4Index + 36 >> 2]), HEAP32[b + 104 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 56 >> 2], HEAP32[_mb4x4Index + 40 >> 2]), HEAP32[b + 112 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 60 >> 2], HEAP32[_mb4x4Index + 44 >> 2]), HEAP32[b + 120 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 4 >> 2], 
                  HEAP32[_mb4x4Index >> 2]), HEAP32[b + 12 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 8 >> 2], HEAP32[_mb4x4Index + 4 >> 2]), HEAP32[b + 20 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 12 >> 2], HEAP32[_mb4x4Index + 8 >> 2]), HEAP32[b + 28 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 20 >> 2], HEAP32[_mb4x4Index + 16 >> 2]), HEAP32[b + 44 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 24 >> 2], HEAP32[_mb4x4Index + 
                  20 >> 2]), HEAP32[b + 52 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 28 >> 2], HEAP32[_mb4x4Index + 24 >> 2]), HEAP32[b + 60 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 36 >> 2], HEAP32[_mb4x4Index + 32 >> 2]), HEAP32[b + 76 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 40 >> 2], HEAP32[_mb4x4Index + 36 >> 2]), HEAP32[b + 84 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 44 >> 2], HEAP32[_mb4x4Index + 40 >> 2]), 
                  HEAP32[b + 92 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 52 >> 2], HEAP32[_mb4x4Index + 48 >> 2]), HEAP32[b + 108 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 56 >> 2], HEAP32[_mb4x4Index + 52 >> 2]), HEAP32[b + 116 >> 2] = c, c = _InnerBoundaryStrength(a, HEAP32[_mb4x4Index + 60 >> 2], HEAP32[_mb4x4Index + 56 >> 2]), HEAP32[b + 124 >> 2] = c)
                }
              }
            }
          }
        }
        d = e != 0 ? 142 : 117;
        b:do {
          if(d == 117) {
            d = HEAP32[b + 32 >> 2] != 0 ? 141 : 118;
            c:do {
              if(d == 118) {
                if(HEAP32[b + 40 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 48 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 56 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 64 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 72 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 80 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 88 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 96 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 104 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 112 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 120 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 12 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 20 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 28 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 44 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 52 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 60 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 76 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 84 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 92 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 108 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 116 >> 2] != 0) {
                  d = 141;
                  break c
                }
                if(HEAP32[b + 124 >> 2] == 0) {
                  d = 142;
                  break b
                }
              }
            }while(0);
            e = 1
          }
        }while(0)
      }
    }
  }while(0);
  return e
}
_GetBoundaryStrengths.X = 1;
function _FilterLuma(a, b, c, d) {
  var e, f, g;
  f = b;
  g = 0;
  b = 4;
  a:for(;;) {
    e = b;
    b = e - 1;
    if(e == 0) {
      break a
    }
    e = HEAP32[f + 4 >> 2] != 0 ? 3 : 4;
    e == 3 && _FilterVerLumaEdge(a, HEAP32[f + 4 >> 2], c + 12, d);
    e = HEAP32[f + 12 >> 2] != 0 ? 5 : 6;
    e == 5 && _FilterVerLumaEdge(a + 4, HEAP32[f + 12 >> 2], c + 24, d);
    e = HEAP32[f + 20 >> 2] != 0 ? 7 : 8;
    e == 7 && _FilterVerLumaEdge(a + 8, HEAP32[f + 20 >> 2], c + 24, d);
    e = HEAP32[f + 28 >> 2] != 0 ? 9 : 10;
    e == 9 && _FilterVerLumaEdge(a + 12, HEAP32[f + 28 >> 2], c + 24, d);
    e = HEAP32[f >> 2] == HEAP32[f + 8 >> 2] ? 11 : 16;
    b:do {
      if(e == 11) {
        if(HEAP32[f + 8 >> 2] != HEAP32[f + 16 >> 2]) {
          e = 16;
          break b
        }
        if(HEAP32[f + 16 >> 2] != HEAP32[f + 24 >> 2]) {
          e = 16;
          break b
        }
        e = HEAP32[f >> 2] != 0 ? 14 : 15;
        e == 14 && _FilterHorLuma(a, HEAP32[f >> 2], c + g * 12, d);
        e = 25;
        break b
      }
    }while(0);
    e == 16 && (e = HEAP32[f >> 2] != 0 ? 17 : 18, e == 17 && _FilterHorLumaEdge(a, HEAP32[f >> 2], c + g * 12, d), e = HEAP32[f + 8 >> 2] != 0 ? 19 : 20, e == 19 && _FilterHorLumaEdge(a + 4, HEAP32[f + 8 >> 2], c + g * 12, d), e = HEAP32[f + 16 >> 2] != 0 ? 21 : 22, e == 21 && _FilterHorLumaEdge(a + 8, HEAP32[f + 16 >> 2], c + g * 12, d), e = HEAP32[f + 24 >> 2] != 0 ? 23 : 24, e == 23 && _FilterHorLumaEdge(a + 12, HEAP32[f + 24 >> 2], c + g * 12, d));
    a += d << 2;
    f += 32;
    g = 2
  }
}
_FilterLuma.X = 1;
function _GetLumaEdgeThresholds(a, b, c) {
  var d, e, f;
  f = HEAP32[b + 20 >> 2];
  d = _clip(0, 51, f + HEAP32[b + 12 >> 2]);
  e = _clip(0, 51, f + HEAP32[b + 16 >> 2]);
  HEAP32[a + 28 >> 2] = HEAPU8[_alphas + d];
  HEAP32[a + 32 >> 2] = HEAPU8[_betas + e];
  HEAP32[a + 24 >> 2] = _tc0 + d * 3;
  if(((c & 2) != 0 ? 1 : 5) == 1) {
    e = HEAP32[HEAP32[b + 204 >> 2] + 20 >> 2], d = e != f ? 2 : 3, d == 2 ? (e = e + (f + 1) >>> 1, d = _clip(0, 51, e + HEAP32[b + 12 >> 2]), e = _clip(0, 51, e + HEAP32[b + 16 >> 2]), HEAP32[a + 4 >> 2] = HEAPU8[_alphas + d], HEAP32[a + 8 >> 2] = HEAPU8[_betas + e], HEAP32[a >> 2] = _tc0 + d * 3) : d == 3 && (HEAP32[a + 4 >> 2] = HEAP32[a + 28 >> 2], HEAP32[a + 8 >> 2] = HEAP32[a + 32 >> 2], HEAP32[a >> 2] = HEAP32[a + 24 >> 2])
  }
  if(((c & 4) != 0 ? 6 : 10) == 6) {
    e = HEAP32[HEAP32[b + 200 >> 2] + 20 >> 2], d = e != f ? 7 : 8, d == 7 ? (e = e + (f + 1) >>> 1, d = _clip(0, 51, e + HEAP32[b + 12 >> 2]), e = _clip(0, 51, e + HEAP32[b + 16 >> 2]), HEAP32[a + 16 >> 2] = HEAPU8[_alphas + d], HEAP32[a + 20 >> 2] = HEAPU8[_betas + e], HEAP32[a + 12 >> 2] = _tc0 + d * 3) : d == 8 && (HEAP32[a + 16 >> 2] = HEAP32[a + 28 >> 2], HEAP32[a + 20 >> 2] = HEAP32[a + 32 >> 2], HEAP32[a + 12 >> 2] = HEAP32[a + 24 >> 2])
  }
}
_GetLumaEdgeThresholds.X = 1;
function _GetChromaEdgeThresholds(a, b, c, d) {
  var e, f, g;
  g = HEAP32[b + 20 >> 2];
  g = _clip(0, 51, g + d);
  g = HEAP32[_h264bsdQpC + (g << 2) >> 2];
  e = _clip(0, 51, g + HEAP32[b + 12 >> 2]);
  f = _clip(0, 51, g + HEAP32[b + 16 >> 2]);
  HEAP32[a + 28 >> 2] = HEAPU8[_alphas + e];
  HEAP32[a + 32 >> 2] = HEAPU8[_betas + f];
  HEAP32[a + 24 >> 2] = _tc0 + e * 3;
  if(((c & 2) != 0 ? 1 : 5) == 1) {
    f = HEAP32[HEAP32[b + 204 >> 2] + 20 >> 2], e = f != HEAP32[b + 20 >> 2] ? 2 : 3, e == 2 ? (e = _clip(0, 51, f + d), f = HEAP32[_h264bsdQpC + (e << 2) >> 2], f = f + (g + 1) >>> 1, e = _clip(0, 51, f + HEAP32[b + 12 >> 2]), f = _clip(0, 51, f + HEAP32[b + 16 >> 2]), HEAP32[a + 4 >> 2] = HEAPU8[_alphas + e], HEAP32[a + 8 >> 2] = HEAPU8[_betas + f], HEAP32[a >> 2] = _tc0 + e * 3) : e == 3 && (HEAP32[a + 4 >> 2] = HEAP32[a + 28 >> 2], HEAP32[a + 8 >> 2] = HEAP32[a + 32 >> 2], HEAP32[a >> 2] = HEAP32[a + 
    24 >> 2])
  }
  if(((c & 4) != 0 ? 6 : 10) == 6) {
    f = HEAP32[HEAP32[b + 200 >> 2] + 20 >> 2], e = f != HEAP32[b + 20 >> 2] ? 7 : 8, e == 7 ? (c = _clip(0, 51, f + d), f = HEAP32[_h264bsdQpC + (c << 2) >> 2], f = f + (g + 1) >>> 1, e = _clip(0, 51, f + HEAP32[b + 12 >> 2]), f = _clip(0, 51, f + HEAP32[b + 16 >> 2]), HEAP32[a + 16 >> 2] = HEAPU8[_alphas + e], HEAP32[a + 20 >> 2] = HEAPU8[_betas + f], HEAP32[a + 12 >> 2] = _tc0 + e * 3) : e == 8 && (HEAP32[a + 16 >> 2] = HEAP32[a + 28 >> 2], HEAP32[a + 20 >> 2] = HEAP32[a + 32 >> 2], HEAP32[a + 
    12 >> 2] = HEAP32[a + 24 >> 2])
  }
}
_GetChromaEdgeThresholds.X = 1;
function _FilterChroma(a, b, c, d, e) {
  var f, g, h;
  g = c;
  f = h = 0;
  a:for(;;) {
    if(!(f < 2)) {
      break a
    }
    c = HEAP32[g + 4 >> 2] != 0 ? 3 : 4;
    c == 3 && (_FilterVerChromaEdge(a, HEAP32[g + 4 >> 2], d + 12, e), _FilterVerChromaEdge(b, HEAP32[g + 4 >> 2], d + 12, e));
    c = HEAP32[g + 36 >> 2] != 0 ? 5 : 6;
    c == 5 && (_FilterVerChromaEdge(a + (e << 1), HEAP32[g + 36 >> 2], d + 12, e), _FilterVerChromaEdge(b + (e << 1), HEAP32[g + 36 >> 2], d + 12, e));
    c = HEAP32[g + 20 >> 2] != 0 ? 7 : 8;
    c == 7 && (_FilterVerChromaEdge(a + 4, HEAP32[g + 20 >> 2], d + 24, e), _FilterVerChromaEdge(b + 4, HEAP32[g + 20 >> 2], d + 24, e));
    c = HEAP32[g + 52 >> 2] != 0 ? 9 : 10;
    c == 9 && (_FilterVerChromaEdge(a + (e << 1) + 4, HEAP32[g + 52 >> 2], d + 24, e), _FilterVerChromaEdge(b + (e << 1) + 4, HEAP32[g + 52 >> 2], d + 24, e));
    c = HEAP32[g >> 2] == HEAP32[g + 8 >> 2] ? 11 : 16;
    b:do {
      if(c == 11) {
        if(HEAP32[g + 8 >> 2] != HEAP32[g + 16 >> 2]) {
          c = 16;
          break b
        }
        if(HEAP32[g + 16 >> 2] != HEAP32[g + 24 >> 2]) {
          c = 16;
          break b
        }
        c = HEAP32[g >> 2] != 0 ? 14 : 15;
        c == 14 && (_FilterHorChroma(a, HEAP32[g >> 2], d + h * 12, e), _FilterHorChroma(b, HEAP32[g >> 2], d + h * 12, e));
        c = 25;
        break b
      }
    }while(0);
    c == 16 && (c = HEAP32[g >> 2] != 0 ? 17 : 18, c == 17 && (_FilterHorChromaEdge(a, HEAP32[g >> 2], d + h * 12, e), _FilterHorChromaEdge(b, HEAP32[g >> 2], d + h * 12, e)), c = HEAP32[g + 8 >> 2] != 0 ? 19 : 20, c == 19 && (_FilterHorChromaEdge(a + 2, HEAP32[g + 8 >> 2], d + h * 12, e), _FilterHorChromaEdge(b + 2, HEAP32[g + 8 >> 2], d + h * 12, e)), c = HEAP32[g + 16 >> 2] != 0 ? 21 : 22, c == 21 && (_FilterHorChromaEdge(a + 4, HEAP32[g + 16 >> 2], d + h * 12, e), _FilterHorChromaEdge(b + 4, 
    HEAP32[g + 16 >> 2], d + h * 12, e)), c = HEAP32[g + 24 >> 2] != 0 ? 23 : 24, c == 23 && (_FilterHorChromaEdge(a + 6, HEAP32[g + 24 >> 2], d + h * 12, e), _FilterHorChromaEdge(b + 6, HEAP32[g + 24 >> 2], d + h * 12, e)));
    g += 64;
    a += e << 2;
    b += e << 2;
    h = 2;
    f += 1
  }
}
_FilterChroma.X = 1;
function _GetBoundaryStrengthsA(a, b) {
  var c;
  if(HEAP16[a + 32 >> 1] != 0) {
    var d = 1;
    c = 2
  }else {
    c = 1
  }
  c == 1 && (d = HEAP16[a + 28 >> 1] != 0);
  HEAP32[b + 32 >> 2] = d ? 2 : 0;
  if(HEAP16[a + 34 >> 1] != 0) {
    var e = 1;
    c = 4
  }else {
    c = 3
  }
  c == 3 && (e = HEAP16[a + 30 >> 1] != 0);
  HEAP32[b + 40 >> 2] = e ? 2 : 0;
  if(HEAP16[a + 40 >> 1] != 0) {
    var f = 1;
    c = 6
  }else {
    c = 5
  }
  c == 5 && (f = HEAP16[a + 36 >> 1] != 0);
  HEAP32[b + 48 >> 2] = f ? 2 : 0;
  if(HEAP16[a + 42 >> 1] != 0) {
    var g = 1;
    c = 8
  }else {
    c = 7
  }
  c == 7 && (g = HEAP16[a + 38 >> 1] != 0);
  HEAP32[b + 56 >> 2] = g ? 2 : 0;
  if(HEAP16[a + 44 >> 1] != 0) {
    var h = 1;
    c = 10
  }else {
    c = 9
  }
  c == 9 && (h = HEAP16[a + 32 >> 1] != 0);
  HEAP32[b + 64 >> 2] = h ? 2 : 0;
  if(HEAP16[a + 46 >> 1] != 0) {
    var j = 1;
    c = 12
  }else {
    c = 11
  }
  c == 11 && (j = HEAP16[a + 34 >> 1] != 0);
  HEAP32[b + 72 >> 2] = j ? 2 : 0;
  if(HEAP16[a + 52 >> 1] != 0) {
    var l = 1;
    c = 14
  }else {
    c = 13
  }
  c == 13 && (l = HEAP16[a + 40 >> 1] != 0);
  HEAP32[b + 80 >> 2] = l ? 2 : 0;
  if(HEAP16[a + 54 >> 1] != 0) {
    var k = 1;
    c = 16
  }else {
    c = 15
  }
  c == 15 && (k = HEAP16[a + 42 >> 1] != 0);
  HEAP32[b + 88 >> 2] = k ? 2 : 0;
  if(HEAP16[a + 48 >> 1] != 0) {
    var m = 1;
    c = 18
  }else {
    c = 17
  }
  c == 17 && (m = HEAP16[a + 44 >> 1] != 0);
  HEAP32[b + 96 >> 2] = m ? 2 : 0;
  if(HEAP16[a + 50 >> 1] != 0) {
    var n = 1;
    c = 20
  }else {
    c = 19
  }
  c == 19 && (n = HEAP16[a + 46 >> 1] != 0);
  HEAP32[b + 104 >> 2] = n ? 2 : 0;
  if(HEAP16[a + 56 >> 1] != 0) {
    var q = 1;
    c = 22
  }else {
    c = 21
  }
  c == 21 && (q = HEAP16[a + 52 >> 1] != 0);
  HEAP32[b + 112 >> 2] = q ? 2 : 0;
  if(HEAP16[a + 58 >> 1] != 0) {
    var p = 1;
    c = 24
  }else {
    c = 23
  }
  c == 23 && (p = HEAP16[a + 54 >> 1] != 0);
  HEAP32[b + 120 >> 2] = p ? 2 : 0;
  if(HEAP16[a + 30 >> 1] != 0) {
    var o = 1;
    c = 26
  }else {
    c = 25
  }
  c == 25 && (o = HEAP16[a + 28 >> 1] != 0);
  HEAP32[b + 12 >> 2] = o ? 2 : 0;
  if(HEAP16[a + 36 >> 1] != 0) {
    var r = 1;
    c = 28
  }else {
    c = 27
  }
  c == 27 && (r = HEAP16[a + 30 >> 1] != 0);
  HEAP32[b + 20 >> 2] = r ? 2 : 0;
  if(HEAP16[a + 38 >> 1] != 0) {
    var s = 1;
    c = 30
  }else {
    c = 29
  }
  c == 29 && (s = HEAP16[a + 36 >> 1] != 0);
  HEAP32[b + 28 >> 2] = s ? 2 : 0;
  if(HEAP16[a + 34 >> 1] != 0) {
    var t = 1;
    c = 32
  }else {
    c = 31
  }
  c == 31 && (t = HEAP16[a + 32 >> 1] != 0);
  HEAP32[b + 44 >> 2] = t ? 2 : 0;
  if(HEAP16[a + 40 >> 1] != 0) {
    var u = 1;
    c = 34
  }else {
    c = 33
  }
  c == 33 && (u = HEAP16[a + 34 >> 1] != 0);
  HEAP32[b + 52 >> 2] = u ? 2 : 0;
  if(HEAP16[a + 42 >> 1] != 0) {
    var v = 1;
    c = 36
  }else {
    c = 35
  }
  c == 35 && (v = HEAP16[a + 40 >> 1] != 0);
  HEAP32[b + 60 >> 2] = v ? 2 : 0;
  if(HEAP16[a + 46 >> 1] != 0) {
    var w = 1;
    c = 38
  }else {
    c = 37
  }
  c == 37 && (w = HEAP16[a + 44 >> 1] != 0);
  HEAP32[b + 76 >> 2] = w ? 2 : 0;
  if(HEAP16[a + 52 >> 1] != 0) {
    var x = 1;
    c = 40
  }else {
    c = 39
  }
  c == 39 && (x = HEAP16[a + 46 >> 1] != 0);
  HEAP32[b + 84 >> 2] = x ? 2 : 0;
  if(HEAP16[a + 54 >> 1] != 0) {
    var z = 1;
    c = 42
  }else {
    c = 41
  }
  c == 41 && (z = HEAP16[a + 52 >> 1] != 0);
  HEAP32[b + 92 >> 2] = z ? 2 : 0;
  if(HEAP16[a + 50 >> 1] != 0) {
    var A = 1;
    c = 44
  }else {
    c = 43
  }
  c == 43 && (A = HEAP16[a + 48 >> 1] != 0);
  HEAP32[b + 108 >> 2] = A ? 2 : 0;
  if(HEAP16[a + 56 >> 1] != 0) {
    var y = 1;
    c = 46
  }else {
    c = 45
  }
  c == 45 && (y = HEAP16[a + 50 >> 1] != 0);
  HEAP32[b + 116 >> 2] = y ? 2 : 0;
  if(HEAP16[a + 58 >> 1] != 0) {
    var B = 1;
    c = 48
  }else {
    c = 47
  }
  c == 47 && (B = HEAP16[a + 56 >> 1] != 0);
  HEAP32[b + 124 >> 2] = B ? 2 : 0
}
_GetBoundaryStrengthsA.X = 1;
function _FilterVerChromaEdge(a, b, c, d) {
  var e, f, g, h, j, l, k;
  e = a;
  k = _h264bsdClip + 512;
  j = HEAP8[e - 2];
  g = HEAP8[e - 1];
  h = HEAP8[e];
  l = HEAP8[e + 1];
  a = _abs((g & 255) - (h & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 1 : 7;
  a:do {
    if(a == 1) {
      if(!(_abs((j & 255) - (g & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
        break a
      }
      if(!(_abs((l & 255) - (h & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
        break a
      }
      a = b < 4 ? 4 : 5;
      a == 4 ? (f = HEAPU8[HEAP32[c >> 2] + (b - 1)] + 1, f = _clip(-f, f, ((h & 255) - (g & 255) << 2) + ((j & 255) - (l & 255)) + 4 >> 3), g = HEAP8[k + ((g & 255) + f)], h = HEAP8[k + ((h & 255) - f)], HEAP8[e - 1] = g, HEAP8[e] = h) : a == 5 && (HEAP8[e - 1] = ((j & 255) << 1) + (g & 255) + (l & 255) + 2 >> 2 & 255, HEAP8[e] = ((l & 255) << 1) + (h & 255) + (j & 255) + 2 >> 2 & 255)
    }
  }while(0);
  e += d;
  j = HEAP8[e - 2];
  g = HEAP8[e - 1];
  h = HEAP8[e];
  l = HEAP8[e + 1];
  a = _abs((g & 255) - (h & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 8 : 14;
  a:do {
    if(a == 8) {
      if(!(_abs((j & 255) - (g & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
        break a
      }
      if(!(_abs((l & 255) - (h & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
        break a
      }
      a = b < 4 ? 11 : 12;
      a == 11 ? (f = HEAPU8[HEAP32[c >> 2] + (b - 1)] + 1, f = _clip(-f, f, ((h & 255) - (g & 255) << 2) + ((j & 255) - (l & 255)) + 4 >> 3), g = HEAP8[k + ((g & 255) + f)], h = HEAP8[k + ((h & 255) - f)], HEAP8[e - 1] = g, HEAP8[e] = h) : a == 12 && (HEAP8[e - 1] = ((j & 255) << 1) + (g & 255) + (l & 255) + 2 >> 2 & 255, HEAP8[e] = ((l & 255) << 1) + (h & 255) + (j & 255) + 2 >> 2 & 255)
    }
  }while(0)
}
_FilterVerChromaEdge.X = 1;
function _FilterHorChroma(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n;
  e = a;
  n = _h264bsdClip + 512;
  a = b < 4 ? 1 : 10;
  do {
    if(a == 1) {
      g = HEAPU8[HEAP32[c >> 2] + (b - 1)] + 1;
      h = 8;
      b:for(;;) {
        if(h == 0) {
          a = 9;
          break b
        }
        k = HEAP8[e + (-d << 1)];
        j = HEAP8[e + -d];
        l = HEAP8[e];
        m = HEAP8[e + d];
        a = _abs((j & 255) - (l & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 4 : 7;
        c:do {
          if(a == 4) {
            if(!(_abs((k & 255) - (j & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
              a = 7;
              break c
            }
            if(!(_abs((m & 255) - (l & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
              a = 7;
              break c
            }
            f = _clip(-g, g, ((l & 255) - (j & 255) << 2) + ((k & 255) - (m & 255)) + 4 >> 3);
            j = HEAP8[n + ((j & 255) + f)];
            l = HEAP8[n + ((l & 255) - f)];
            HEAP8[e + -d] = j;
            HEAP8[e] = l
          }
        }while(0);
        h -= 1;
        e += 1
      }
    }else {
      if(a == 10) {
        h = 8;
        b:for(;;) {
          if(h == 0) {
            a = 18;
            break b
          }
          k = HEAP8[e + (-d << 1)];
          j = HEAP8[e + -d];
          l = HEAP8[e];
          m = HEAP8[e + d];
          a = _abs((j & 255) - (l & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 13 : 16;
          c:do {
            if(a == 13) {
              if(!(_abs((k & 255) - (j & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
                a = 16;
                break c
              }
              if(!(_abs((m & 255) - (l & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
                a = 16;
                break c
              }
              HEAP8[e + -d] = ((k & 255) << 1) + (j & 255) + (m & 255) + 2 >> 2 & 255;
              HEAP8[e] = ((m & 255) << 1) + (l & 255) + (k & 255) + 2 >> 2 & 255
            }
          }while(0);
          h -= 1;
          e += 1
        }
      }
    }
  }while(0)
}
_FilterHorChroma.X = 1;
function _FilterHorChromaEdge(a, b, c, d) {
  var e, f, g, h, j, l, k, m;
  m = _h264bsdClip + 512;
  f = HEAPU8[HEAP32[c >> 2] + (b - 1)] + 1;
  g = 2;
  a:for(;;) {
    if(g == 0) {
      break a
    }
    l = HEAP8[a + (-d << 1)];
    h = HEAP8[a + -d];
    j = HEAP8[a];
    k = HEAP8[a + d];
    b = _abs((h & 255) - (j & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 3 : 6;
    b:do {
      if(b == 3) {
        if(!(_abs((l & 255) - (h & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
          break b
        }
        if(!(_abs((k & 255) - (j & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
          break b
        }
        e = _clip(-f, f, ((j & 255) - (h & 255) << 2) + ((l & 255) - (k & 255)) + 4 >> 3);
        h = HEAP8[m + ((h & 255) + e)];
        j = HEAP8[m + ((j & 255) - e)];
        HEAP8[a + -d] = h;
        HEAP8[a] = j
      }
    }while(0);
    g -= 1;
    a += 1
  }
}
_FilterHorChromaEdge.X = 1;
function _FilterVerLumaEdge(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n, q, p, o, r;
  p = _h264bsdClip + 512;
  o = HEAP32[c + 4 >> 2];
  r = HEAP32[c + 8 >> 2];
  e = b < 4 ? 1 : 14;
  do {
    if(e == 1) {
      f = g = HEAPU8[HEAP32[c >> 2] + (b - 1)];
      h = 4;
      b:for(;;) {
        if(h == 0) {
          e = 13;
          break b
        }
        k = HEAPU8[a - 2];
        j = HEAPU8[a - 1];
        l = HEAPU8[a];
        m = HEAPU8[a + 1];
        e = _abs(j - l) < o ? 4 : 11;
        c:do {
          if(e == 4) {
            if(!(_abs(k - j) < r)) {
              e = 11;
              break c
            }
            if(!(_abs(m - l) < r)) {
              e = 11;
              break c
            }
            n = HEAPU8[a - 3];
            q = HEAPU8[a + 2];
            e = _abs(n - j) < r ? 7 : 8;
            e == 7 && (n = n + (l + (j + 1) >> 1) - (k << 1) >> 1, e = k, n = _clip(-g, g, n), HEAP8[a - 2] = e + n & 255, f += 1);
            e = _abs(q - l) < r ? 9 : 10;
            e == 9 && (n = q + (l + (j + 1) >> 1) - (m << 1) >> 1, q = m, n = _clip(-g, g, n), HEAP8[a + 1] = q + n & 255, f += 1);
            n = (l - j << 2) + (k - m) + 4 >> 3;
            f = _clip(-f, f, n);
            j = HEAPU8[p + (j + f)];
            l = HEAPU8[p + (l - f)];
            f = g;
            HEAP8[a - 1] = j & 255;
            HEAP8[a] = l & 255
          }
        }while(0);
        h -= 1;
        a += d
      }
    }else {
      if(e == 14) {
        h = 4;
        b:for(;;) {
          if(h == 0) {
            e = 30;
            break b
          }
          k = HEAPU8[a - 2];
          j = HEAPU8[a - 1];
          l = HEAPU8[a];
          m = HEAPU8[a + 1];
          e = _abs(j - l) < o ? 17 : 28;
          c:do {
            if(e == 17) {
              if(!(_abs(k - j) < r)) {
                e = 28;
                break c
              }
              if(!(_abs(m - l) < r)) {
                e = 28;
                break c
              }
              g = _abs(j - l) < (o >>> 2) + 2 ? 1 : 0;
              n = HEAPU8[a - 3];
              q = HEAPU8[a + 2];
              e = g != 0 ? 20 : 22;
              d:do {
                if(e == 20) {
                  if(!(_abs(n - j) < r)) {
                    e = 22;
                    break d
                  }
                  f = k + j + l;
                  HEAP8[a - 1] = n + (f << 1) + m + 4 >> 3 & 255;
                  HEAP8[a - 2] = f + (n + 2) >> 2 & 255;
                  HEAP8[a - 3] = (HEAPU8[a - 4] << 1) + n * 3 + f + 4 >> 3 & 255;
                  e = 23;
                  break d
                }
              }while(0);
              e == 22 && (HEAP8[a - 1] = (k << 1) + j + m + 2 >> 2 & 255);
              e = g != 0 ? 24 : 26;
              d:do {
                if(e == 24) {
                  if(!(_abs(q - l) < r)) {
                    e = 26;
                    break d
                  }
                  f = j + l + m;
                  HEAP8[a] = k + (f << 1) + q + 4 >> 3 & 255;
                  HEAP8[a + 1] = q + (f + 2) >> 2 & 255;
                  HEAP8[a + 2] = (HEAPU8[a + 3] << 1) + q * 3 + f + 4 >> 3 & 255;
                  e = 27;
                  break d
                }
              }while(0);
              e == 26 && (HEAP8[a] = (m << 1) + l + k + 2 >> 2 & 255)
            }
          }while(0);
          h -= 1;
          a += d
        }
      }
    }
  }while(0)
}
_FilterVerLumaEdge.X = 1;
function _FilterHorLuma(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n, q, p, o, r;
  p = _h264bsdClip + 512;
  o = HEAP32[c + 4 >> 2];
  r = HEAP32[c + 8 >> 2];
  e = b < 4 ? 1 : 14;
  do {
    if(e == 1) {
      f = g = HEAPU8[HEAP32[c >> 2] + (b - 1)];
      h = 16;
      b:for(;;) {
        if(h == 0) {
          e = 13;
          break b
        }
        k = HEAPU8[a + (-d << 1)];
        j = HEAPU8[a + -d];
        l = HEAPU8[a];
        m = HEAPU8[a + d];
        e = _abs(j - l) < o ? 4 : 11;
        c:do {
          if(e == 4) {
            if(!(_abs(k - j) < r)) {
              e = 11;
              break c
            }
            if(!(_abs(m - l) < r)) {
              e = 11;
              break c
            }
            n = HEAPU8[a + -d * 3];
            e = _abs(n - j) < r ? 7 : 8;
            e == 7 && (n = n + (l + (j + 1) >> 1) - (k << 1) >> 1, e = k, n = _clip(-g, g, n), HEAP8[a + (-d << 1)] = e + n & 255, f += 1);
            q = HEAPU8[a + (d << 1)];
            e = _abs(q - l) < r ? 9 : 10;
            e == 9 && (n = q + (l + (j + 1) >> 1) - (m << 1) >> 1, q = m, n = _clip(-g, g, n), HEAP8[a + d] = q + n & 255, f += 1);
            n = (l - j << 2) + (k - m) + 4 >> 3;
            f = _clip(-f, f, n);
            j = HEAPU8[p + (j + f)];
            l = HEAPU8[p + (l - f)];
            f = g;
            HEAP8[a + -d] = j & 255;
            HEAP8[a] = l & 255
          }
        }while(0);
        h -= 1;
        a += 1
      }
    }else {
      if(e == 14) {
        h = 16;
        b:for(;;) {
          if(h == 0) {
            e = 30;
            break b
          }
          k = HEAPU8[a + (-d << 1)];
          j = HEAPU8[a + -d];
          l = HEAPU8[a];
          m = HEAPU8[a + d];
          e = _abs(j - l) < o ? 17 : 28;
          c:do {
            if(e == 17) {
              if(!(_abs(k - j) < r)) {
                e = 28;
                break c
              }
              if(!(_abs(m - l) < r)) {
                e = 28;
                break c
              }
              g = _abs(j - l) < (o >>> 2) + 2 ? 1 : 0;
              n = HEAPU8[a + -d * 3];
              q = HEAPU8[a + (d << 1)];
              e = g != 0 ? 20 : 22;
              d:do {
                if(e == 20) {
                  if(!(_abs(n - j) < r)) {
                    e = 22;
                    break d
                  }
                  f = k + j + l;
                  HEAP8[a + -d] = n + (f << 1) + m + 4 >> 3 & 255;
                  HEAP8[a + (-d << 1)] = f + (n + 2) >> 2 & 255;
                  HEAP8[a + -d * 3] = (HEAPU8[a + (-d << 2)] << 1) + n * 3 + f + 4 >> 3 & 255;
                  e = 23;
                  break d
                }
              }while(0);
              e == 22 && (HEAP8[a + -d] = (k << 1) + j + m + 2 >> 2 & 255);
              e = g != 0 ? 24 : 26;
              d:do {
                if(e == 24) {
                  if(!(_abs(q - l) < r)) {
                    e = 26;
                    break d
                  }
                  f = j + l + m;
                  HEAP8[a] = k + (f << 1) + q + 4 >> 3 & 255;
                  HEAP8[a + d] = q + (f + 2) >> 2 & 255;
                  HEAP8[a + (d << 1)] = (HEAPU8[a + d * 3] << 1) + q * 3 + f + 4 >> 3 & 255;
                  e = 27;
                  break d
                }
              }while(0);
              e == 26 && (HEAP8[a] = (m << 1) + l + k + 2 >> 2 & 255)
            }
          }while(0);
          h -= 1;
          a += 1
        }
      }
    }
  }while(0)
}
_FilterHorLuma.X = 1;
function _FilterHorLumaEdge(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n;
  n = _h264bsdClip + 512;
  f = b = HEAPU8[HEAP32[c >> 2] + (b - 1)];
  g = 4;
  a:for(;;) {
    if(g == 0) {
      break a
    }
    l = HEAP8[a + (-d << 1)];
    h = HEAP8[a + -d];
    j = HEAP8[a];
    k = HEAP8[a + d];
    e = _abs((h & 255) - (j & 255)) >>> 0 < HEAPU32[c + 4 >> 2] >>> 0 ? 3 : 10;
    b:do {
      if(e == 3) {
        if(!(_abs((l & 255) - (h & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
          break b
        }
        if(!(_abs((k & 255) - (j & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0)) {
          break b
        }
        m = HEAP8[a + -d * 3];
        e = _abs((m & 255) - (h & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0 ? 6 : 7;
        e == 6 && (m = (m & 255) + ((h & 255) + (j & 255) + 1 >> 1) - ((l & 255) << 1) >> 1, e = l & 255, m = _clip(-b, b, m), HEAP8[a + (-d << 1)] = e + m & 255, f += 1);
        m = HEAP8[a + (d << 1)];
        e = _abs((m & 255) - (j & 255)) >>> 0 < HEAPU32[c + 8 >> 2] >>> 0 ? 8 : 9;
        if(e == 8) {
          m = (m & 255) + ((h & 255) + (j & 255) + 1 >> 1) - ((k & 255) << 1) >> 1;
          var q = k & 255;
          m = _clip(-b, b, m);
          HEAP8[a + d] = q + m & 255;
          f += 1
        }
        m = ((j & 255) - (h & 255) << 2) + ((l & 255) - (k & 255)) + 4 >> 3;
        f = _clip(-f, f, m);
        h = HEAP8[n + ((h & 255) + f)];
        j = HEAP8[n + ((j & 255) - f)];
        f = b;
        HEAP8[a + -d] = h;
        HEAP8[a] = j
      }
    }while(0);
    g -= 1;
    a += 1
  }
}
_FilterHorLumaEdge.X = 1;
function _EdgeBoundaryStrength(a, b, c, d) {
  var e, f;
  e = HEAP16[a + 28 + (c << 1) >> 1] != 0 ? 2 : 1;
  a:do {
    if(e == 1) {
      if(HEAP16[b + 28 + (d << 1) >> 1] != 0) {
        e = 2;
        break a
      }
      e = HEAP32[a + 116 + (c >>> 2 << 2) >> 2] != HEAP32[b + 116 + (d >>> 2 << 2) >> 2] ? 6 : 4;
      b:do {
        if(e == 4) {
          if(_abs(HEAP16[a + 132 + (c << 2) >> 1] - HEAP16[b + 132 + (d << 2) >> 1]) >= 4) {
            break b
          }
          if(_abs(HEAP16[a + 132 + (c << 2) + 2 >> 1] - HEAP16[b + 132 + (d << 2) + 2 >> 1]) >= 4) {
            break b
          }
          f = 0;
          e = 8;
          break a
        }
      }while(0);
      f = 1;
      e = 8;
      break a
    }
  }while(0);
  e == 2 && (f = 2);
  return f
}
_EdgeBoundaryStrength.X = 1;
function _IsSliceBoundaryOnLeft(a) {
  var b, a = HEAP32[a + 4 >> 2] != HEAP32[HEAP32[a + 200 >> 2] + 4 >> 2] ? 1 : 2;
  a == 1 ? b = 1 : a == 2 && (b = 0);
  return b
}
function _IsSliceBoundaryOnTop(a) {
  var b, a = HEAP32[a + 4 >> 2] != HEAP32[HEAP32[a + 204 >> 2] + 4 >> 2] ? 1 : 2;
  a == 1 ? b = 1 : a == 2 && (b = 0);
  return b
}
function _InnerBoundaryStrength(a, b, c) {
  var d, e, f, g, h, j, l;
  d = HEAP16[a + 28 + (b << 1) >> 1];
  f = HEAP16[a + 28 + (c << 1) >> 1];
  g = HEAP16[a + 132 + (b << 2) >> 1];
  h = HEAP16[a + 132 + (c << 2) >> 1];
  j = HEAP16[a + 132 + (b << 2) + 2 >> 1];
  l = HEAP16[a + 132 + (c << 2) + 2 >> 1];
  d = d != 0 ? 2 : 1;
  a:do {
    if(d == 1) {
      if(f != 0) {
        d = 2;
        break a
      }
      d = _abs(g - h) >= 4 ? 6 : 4;
      b:do {
        if(d == 4) {
          if(_abs(j - l) >= 4) {
            break b
          }
          if(HEAP32[a + 116 + (b >>> 2 << 2) >> 2] != HEAP32[a + 116 + (c >>> 2 << 2) >> 2]) {
            break b
          }
          e = 0;
          d = 8;
          break a
        }
      }while(0);
      e = 1;
      d = 8;
      break a
    }
  }while(0);
  d == 2 && (e = 2);
  return e
}
_InnerBoundaryStrength.X = 1;
function _h264bsdConceal(a, b, c) {
  var d, e, f, g, h, j, l, k, m;
  j = HEAP32[b + 4 >> 2];
  l = HEAP32[b + 8 >> 2];
  k = 0;
  d = c == 0 ? 3 : 1;
  a:do {
    if(d == 1) {
      if(c == 5) {
        d = 3;
        break a
      }
      d = HEAP32[a + 3384 >> 2] != 0 ? 3 : 9;
      break a
    }
  }while(0);
  do {
    if(d == 3) {
      f = 0;
      b:for(;;) {
        k = _h264bsdGetRefPicData(a + 1220, f);
        f += 1;
        if(f >= 16) {
          d = 5;
          break b
        }
        if(k != 0) {
          d = 8;
          break b
        }
      }
    }
  }while(0);
  f = g = h = 0;
  a:for(;;) {
    f < HEAPU32[a + 1176 >> 2] ? d = 11 : (m = 0, d = 12);
    d == 11 && (m = HEAP32[HEAP32[a + 1212 >> 2] + f * 216 + 196 >> 2] != 0 ^ 1);
    if(!m) {
      break a
    }
    f += 1;
    h += 1;
    d = h == j ? 14 : 15;
    d == 14 && (g += 1, h = 0)
  }
  d = f == HEAP32[a + 1176 >> 2] ? 17 : 28;
  do {
    if(d == 17) {
      d = c == 2 ? 19 : 18;
      b:do {
        if(d == 18) {
          d = c == 7 ? 19 : 20;
          break b
        }
      }while(0);
      b:do {
        if(d == 19) {
          d = HEAP32[a + 3384 >> 2] == 0 ? 21 : 20;
          break b
        }
      }while(0);
      b:do {
        if(d == 20) {
          if(k == 0) {
            d = 21;
            break b
          }
          _H264SwDecMemcpy(HEAP32[b >> 2], k, j * l * 384);
          d = 23;
          break b
        }
      }while(0);
      d == 21 && _H264SwDecMemset(HEAP32[b >> 2], 128, j * l * 384);
      HEAP32[a + 1204 >> 2] = HEAP32[a + 1176 >> 2];
      f = 0;
      b:for(;;) {
        if(!(f < HEAPU32[a + 1176 >> 2])) {
          d = 27;
          break b
        }
        HEAP32[HEAP32[a + 1212 >> 2] + f * 216 + 8 >> 2] = 1;
        f += 1
      }
      e = 0
    }else {
      if(d == 28) {
        m = HEAP32[a + 1212 >> 2] + g * j * 216;
        e = h;
        b:for(;;) {
          d = e;
          e = d - 1;
          if(d == 0) {
            break b
          }
          _ConcealMb(m + e * 216, b, g, e, c, k);
          HEAP32[m + e * 216 + 196 >> 2] = 1;
          HEAP32[a + 1204 >> 2] += 1
        }
        e = h + 1;
        b:for(;;) {
          if(!(e < j)) {
            break b
          }
          d = HEAP32[m + e * 216 + 196 >> 2] != 0 ? 35 : 34;
          d == 34 && (_ConcealMb(m + e * 216, b, g, e, c, k), HEAP32[m + e * 216 + 196 >> 2] = 1, HEAP32[a + 1204 >> 2] += 1);
          e += 1
        }
        d = g != 0 ? 38 : 46;
        do {
          if(d == 38) {
            e = 0;
            c:for(;;) {
              if(!(e < j)) {
                d = 45;
                break c
              }
              f = g - 1;
              m = HEAP32[a + 1212 >> 2] + f * j * 216 + e * 216;
              d:for(;;) {
                _ConcealMb(m, b, f, e, c, k);
                HEAP32[m + 196 >> 2] = 1;
                HEAP32[a + 1204 >> 2] += 1;
                m += -j * 216;
                var n = f;
                f = n - 1;
                if(n == 0) {
                  d = 43;
                  break d
                }
              }
              e += 1
            }
          }
        }while(0);
        f = g + 1;
        b:for(;;) {
          if(!(f < l)) {
            d = 56;
            break b
          }
          m = HEAP32[a + 1212 >> 2] + f * j * 216;
          e = 0;
          c:for(;;) {
            if(!(e < j)) {
              d = 54;
              break c
            }
            d = HEAP32[m + e * 216 + 196 >> 2] != 0 ? 52 : 51;
            d == 51 && (_ConcealMb(m + e * 216, b, f, e, c, k), HEAP32[m + e * 216 + 196 >> 2] = 1, HEAP32[a + 1204 >> 2] += 1);
            e += 1
          }
          f += 1
        }
        e = 0
      }
    }
  }while(0);
  return e
}
_h264bsdConceal.X = 1;
function _ConcealMb(a, b, c, d, e, f) {
  var g = STACKTOP;
  STACKTOP += 540;
  var h, j, l, k, m, n, q, p = g + 384, o = g + 448, r = g + 464, s = g + 480, t = g + 496, u, v, w, x;
  k = g + 512;
  l = g + 516;
  m = HEAP32[b + 4 >> 2];
  n = HEAP32[b + 8 >> 2];
  _h264bsdSetCurrImageMbPointers(b, c * m + d);
  q = HEAP32[b >> 2] + ((c << 4) * m << 4) + (d << 4);
  u = v = w = x = 0;
  HEAP32[a + 20 >> 2] = 40;
  HEAP32[a + 8 >> 2] = 0;
  HEAP32[a >> 2] = 6;
  HEAP32[a + 12 >> 2] = 0;
  HEAP32[a + 16 >> 2] = 0;
  HEAP32[a + 24 >> 2] = 0;
  h = e == 2 ? 2 : 1;
  a:do {
    if(h == 1) {
      if(e == 7) {
        h = 2;
        break a
      }
      var z, A, y;
      h = k;
      z = h + 4;
      y = 0;
      y < 0 && (y += 256);
      for(y = y + (y << 8) + (y << 16) + y * 16777216;h % 4 !== 0 && h < z;) {
        HEAP8[h++] = 0
      }
      h >>= 2;
      for(A = z >> 2;h < A;) {
        HEAP32[h++] = y
      }
      for(h <<= 2;h < z;) {
        HEAP8[h++] = 0
      }
      HEAP32[l + 4 >> 2] = m;
      HEAP32[l + 8 >> 2] = n;
      HEAP32[l >> 2] = f;
      h = HEAP32[l >> 2] != 0 ? 4 : 5;
      do {
        if(h == 4) {
          _h264bsdPredictSamples(g, k, l, d << 4, c << 4, 0, 0, 16, 16);
          _h264bsdWriteMacroblock(b, g);
          j = 0;
          h = 92;
          break a
        }else {
          if(h == 5) {
            _H264SwDecMemset(g, 0, 384);
            h = 7;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  a:do {
    if(h == 2) {
      _H264SwDecMemset(g, 0, 384);
      h = 7;
      break a
    }
  }while(0);
  do {
    if(h == 7) {
      _H264SwDecMemset(p, 0, 64);
      j = k = f = 0;
      h = c != 0 ? 8 : 10;
      b:do {
        if(h == 8) {
          if(HEAP32[a + -m * 216 + 196 >> 2] == 0) {
            break b
          }
          u = 1;
          l = e = q + -(m << 4);
          e = l + 1;
          HEAP32[o >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 4 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 8 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 12 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 12 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[o + 12 >> 2] += HEAPU8[l];
          HEAP32[o + 12 >> 2] += HEAPU8[e];
          f += 1;
          j += 1;
          HEAP32[p >> 2] += HEAP32[o >> 2] + HEAP32[o + 4 >> 2] + HEAP32[o + 8 >> 2] + HEAP32[o + 12 >> 2];
          HEAP32[p + 4 >> 2] += HEAP32[o >> 2] + HEAP32[o + 4 >> 2] - HEAP32[o + 8 >> 2] - HEAP32[o + 12 >> 2]
        }
      }while(0);
      h = c != n - 1 ? 11 : 13;
      b:do {
        if(h == 11) {
          if(HEAP32[a + m * 216 + 196 >> 2] == 0) {
            break b
          }
          v = 1;
          l = e = q + (m << 4 << 4);
          e = l + 1;
          HEAP32[r >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 4 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 4 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 8 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 8 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 12 >> 2] = HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 12 >> 2] += HEAPU8[l];
          l = e;
          e = l + 1;
          HEAP32[r + 12 >> 2] += HEAPU8[l];
          HEAP32[r + 12 >> 2] += HEAPU8[e];
          f += 1;
          j += 1;
          HEAP32[p >> 2] += HEAP32[r >> 2] + HEAP32[r + 4 >> 2] + HEAP32[r + 8 >> 2] + HEAP32[r + 12 >> 2];
          HEAP32[p + 4 >> 2] += HEAP32[r >> 2] + HEAP32[r + 4 >> 2] - HEAP32[r + 8 >> 2] - HEAP32[r + 12 >> 2]
        }
      }while(0);
      h = d != 0 ? 14 : 16;
      b:do {
        if(h == 14) {
          if(HEAP32[a - 216 + 196 >> 2] == 0) {
            break b
          }
          w = 1;
          e = q - 1;
          HEAP32[s >> 2] = HEAPU8[e];
          HEAP32[s >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[s >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[s >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[s + 4 >> 2] = HEAPU8[e];
          HEAP32[s + 4 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[s + 4 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[s + 4 >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[s + 8 >> 2] = HEAPU8[e];
          HEAP32[s + 8 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[s + 8 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[s + 8 >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[s + 12 >> 2] = HEAPU8[e];
          HEAP32[s + 12 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[s + 12 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[s + 12 >> 2] += HEAPU8[e + m * 48];
          f += 1;
          k += 1;
          HEAP32[p >> 2] += HEAP32[s >> 2] + HEAP32[s + 4 >> 2] + HEAP32[s + 8 >> 2] + HEAP32[s + 12 >> 2];
          HEAP32[p + 16 >> 2] += HEAP32[s >> 2] + HEAP32[s + 4 >> 2] - HEAP32[s + 8 >> 2] - HEAP32[s + 12 >> 2]
        }
      }while(0);
      h = d != m - 1 ? 17 : 19;
      b:do {
        if(h == 17) {
          if(HEAP32[a + 412 >> 2] == 0) {
            break b
          }
          x = 1;
          e = q + 16;
          HEAP32[t >> 2] = HEAPU8[e];
          HEAP32[t >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[t >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[t >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[t + 4 >> 2] = HEAPU8[e];
          HEAP32[t + 4 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[t + 4 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[t + 4 >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[t + 8 >> 2] = HEAPU8[e];
          HEAP32[t + 8 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[t + 8 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[t + 8 >> 2] += HEAPU8[e + m * 48];
          e += m << 6;
          HEAP32[t + 12 >> 2] = HEAPU8[e];
          HEAP32[t + 12 >> 2] += HEAPU8[e + (m << 4)];
          HEAP32[t + 12 >> 2] += HEAPU8[e + (m << 5)];
          HEAP32[t + 12 >> 2] += HEAPU8[e + m * 48];
          f += 1;
          k += 1;
          HEAP32[p >> 2] += HEAP32[t >> 2] + HEAP32[t + 4 >> 2] + HEAP32[t + 8 >> 2] + HEAP32[t + 12 >> 2];
          HEAP32[p + 16 >> 2] += HEAP32[t >> 2] + HEAP32[t + 4 >> 2] - HEAP32[t + 8 >> 2] - HEAP32[t + 12 >> 2]
        }
      }while(0);
      h = j != 0 ? 23 : 20;
      b:do {
        if(h == 20) {
          if(w == 0) {
            h = 23;
            break b
          }
          if(x == 0) {
            h = 23;
            break b
          }
          HEAP32[p + 4 >> 2] = HEAP32[s >> 2] + HEAP32[s + 4 >> 2] + HEAP32[s + 8 >> 2] + HEAP32[s + 12 >> 2] - HEAP32[t >> 2] - HEAP32[t + 4 >> 2] - HEAP32[t + 8 >> 2] - HEAP32[t + 12 >> 2] >> 5;
          h = 26;
          break b
        }
      }while(0);
      h == 23 && (h = j != 0 ? 24 : 25, h == 24 && (HEAP32[p + 4 >> 2] >>= j + 3));
      h = k != 0 ? 30 : 27;
      b:do {
        if(h == 27) {
          if(u == 0) {
            h = 30;
            break b
          }
          if(v == 0) {
            h = 30;
            break b
          }
          HEAP32[p + 16 >> 2] = HEAP32[o >> 2] + HEAP32[o + 4 >> 2] + HEAP32[o + 8 >> 2] + HEAP32[o + 12 >> 2] - HEAP32[r >> 2] - HEAP32[r + 4 >> 2] - HEAP32[r + 8 >> 2] - HEAP32[r + 12 >> 2] >> 5;
          h = 33;
          break b
        }
      }while(0);
      h == 30 && (h = k != 0 ? 31 : 32, h == 31 && (HEAP32[p + 16 >> 2] >>= k + 3));
      h = f == 1 ? 34 : f == 2 ? 35 : f == 3 ? 36 : 37;
      h == 37 ? HEAP32[p >> 2] >>= 6 : h == 34 ? HEAP32[p >> 2] >>= 4 : h == 35 ? HEAP32[p >> 2] >>= 5 : h == 36 && (HEAP32[p >> 2] = HEAP32[p >> 2] * 21 >> 10);
      _Transform(p);
      f = 0;
      e = g;
      j = p;
      b:for(;;) {
        if(!(f < 256)) {
          h = 49;
          break b
        }
        k = HEAP32[j + ((f & 15) >>> 2 << 2) >> 2];
        h = k < 0 ? 41 : 42;
        if(h == 41) {
          var B = 0
        }else {
          if(h == 42) {
            h = k > 255 ? 43 : 44;
            if(h == 43) {
              var C = 255
            }else {
              h == 44 && (C = k)
            }
            B = C
          }
        }
        q = e;
        e = q + 1;
        HEAP8[q] = B & 255;
        f += 1;
        h = (f & 63) != 0 ? 48 : 47;
        h == 47 && (j += 16)
      }
      q = HEAP32[b >> 2] + (m * n << 8) + ((c << 3) * m << 3) + (d << 3);
      l = 0;
      b:for(;;) {
        if(!(l < 2)) {
          h = 91;
          break b
        }
        _H264SwDecMemset(p, 0, 64);
        j = k = f = 0;
        h = u != 0 ? 52 : 53;
        h == 52 && (h = e = q + -(m << 3), e = h + 1, HEAP32[o >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[o >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[o + 4 >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[o + 4 >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[o + 8 >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[o + 8 >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[o + 12 >> 2] = HEAPU8[h], HEAP32[o + 12 >> 2] += HEAPU8[e], f += 1, j += 1, HEAP32[p >> 2] += HEAP32[o >> 2] + HEAP32[o + 4 >> 2] + HEAP32[o + 8 >> 
        2] + HEAP32[o + 12 >> 2], HEAP32[p + 4 >> 2] += HEAP32[o >> 2] + HEAP32[o + 4 >> 2] - HEAP32[o + 8 >> 2] - HEAP32[o + 12 >> 2]);
        h = v != 0 ? 54 : 55;
        h == 54 && (h = e = q + (m << 3 << 3), e = h + 1, HEAP32[r >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[r >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[r + 4 >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[r + 4 >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[r + 8 >> 2] = HEAPU8[h], h = e, e = h + 1, HEAP32[r + 8 >> 2] += HEAPU8[h], h = e, e = h + 1, HEAP32[r + 12 >> 2] = HEAPU8[h], HEAP32[r + 12 >> 2] += HEAPU8[e], f += 1, j += 1, HEAP32[p >> 2] += HEAP32[r >> 2] + HEAP32[r + 4 >> 2] + HEAP32[r + 
        8 >> 2] + HEAP32[r + 12 >> 2], HEAP32[p + 4 >> 2] += HEAP32[r >> 2] + HEAP32[r + 4 >> 2] - HEAP32[r + 8 >> 2] - HEAP32[r + 12 >> 2]);
        h = w != 0 ? 56 : 57;
        h == 56 && (e = q - 1, HEAP32[s >> 2] = HEAPU8[e], HEAP32[s >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[s + 4 >> 2] = HEAPU8[e], HEAP32[s + 4 >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[s + 8 >> 2] = HEAPU8[e], HEAP32[s + 8 >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[s + 12 >> 2] = HEAPU8[e], HEAP32[s + 12 >> 2] += HEAPU8[e + (m << 3)], f += 1, k += 1, HEAP32[p >> 2] += HEAP32[s >> 2] + HEAP32[s + 4 >> 2] + HEAP32[s + 8 >> 2] + HEAP32[s + 12 >> 2], HEAP32[p + 16 >> 2] += 
        HEAP32[s >> 2] + HEAP32[s + 4 >> 2] - HEAP32[s + 8 >> 2] - HEAP32[s + 12 >> 2]);
        h = x != 0 ? 58 : 59;
        h == 58 && (e = q + 8, HEAP32[t >> 2] = HEAPU8[e], HEAP32[t >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[t + 4 >> 2] = HEAPU8[e], HEAP32[t + 4 >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[t + 8 >> 2] = HEAPU8[e], HEAP32[t + 8 >> 2] += HEAPU8[e + (m << 3)], e += m << 4, HEAP32[t + 12 >> 2] = HEAPU8[e], HEAP32[t + 12 >> 2] += HEAPU8[e + (m << 3)], f += 1, k += 1, HEAP32[p >> 2] += HEAP32[t >> 2] + HEAP32[t + 4 >> 2] + HEAP32[t + 8 >> 2] + HEAP32[t + 12 >> 2], HEAP32[p + 16 >> 2] += 
        HEAP32[t >> 2] + HEAP32[t + 4 >> 2] - HEAP32[t + 8 >> 2] - HEAP32[t + 12 >> 2]);
        h = j != 0 ? 63 : 60;
        c:do {
          if(h == 60) {
            if(w == 0) {
              h = 63;
              break c
            }
            if(x == 0) {
              h = 63;
              break c
            }
            HEAP32[p + 4 >> 2] = HEAP32[s >> 2] + HEAP32[s + 4 >> 2] + HEAP32[s + 8 >> 2] + HEAP32[s + 12 >> 2] - HEAP32[t >> 2] - HEAP32[t + 4 >> 2] - HEAP32[t + 8 >> 2] - HEAP32[t + 12 >> 2] >> 4;
            h = 66;
            break c
          }
        }while(0);
        h == 63 && (h = j != 0 ? 64 : 65, h == 64 && (HEAP32[p + 4 >> 2] >>= j + 2));
        h = k != 0 ? 70 : 67;
        c:do {
          if(h == 67) {
            if(u == 0) {
              h = 70;
              break c
            }
            if(v == 0) {
              h = 70;
              break c
            }
            HEAP32[p + 16 >> 2] = HEAP32[o >> 2] + HEAP32[o + 4 >> 2] + HEAP32[o + 8 >> 2] + HEAP32[o + 12 >> 2] - HEAP32[r >> 2] - HEAP32[r + 4 >> 2] - HEAP32[r + 8 >> 2] - HEAP32[r + 12 >> 2] >> 4;
            h = 73;
            break c
          }
        }while(0);
        h == 70 && (h = k != 0 ? 71 : 72, h == 71 && (HEAP32[p + 16 >> 2] >>= k + 2));
        h = f == 1 ? 74 : f == 2 ? 75 : f == 3 ? 76 : 77;
        h == 77 ? HEAP32[p >> 2] >>= 5 : h == 74 ? HEAP32[p >> 2] >>= 3 : h == 75 ? HEAP32[p >> 2] >>= 4 : h == 76 && (HEAP32[p >> 2] = HEAP32[p >> 2] * 21 >> 9);
        _Transform(p);
        e = g + 256 + (l << 6);
        f = 0;
        j = p;
        c:for(;;) {
          if(!(f < 64)) {
            h = 89;
            break c
          }
          k = HEAP32[j + ((f & 7) >>> 1 << 2) >> 2];
          h = k < 0 ? 81 : 82;
          if(h == 81) {
            var D = 0
          }else {
            if(h == 82) {
              h = k > 255 ? 83 : 84;
              if(h == 83) {
                var E = 255
              }else {
                h == 84 && (E = k)
              }
              D = E
            }
          }
          k = e;
          e = k + 1;
          HEAP8[k] = D & 255;
          f += 1;
          h = (f & 15) != 0 ? 88 : 87;
          h == 87 && (j += 16)
        }
        q += m * n << 6;
        l += 1
      }
      _h264bsdWriteMacroblock(b, g);
      j = 0
    }
  }while(0);
  STACKTOP = g;
  return j
}
_ConcealMb.X = 1;
function _Transform(a) {
  var b, c, d, e;
  b = HEAP32[a + 4 >> 2] != 0 ? 3 : 1;
  a:do {
    if(b == 1) {
      if(HEAP32[a + 16 >> 2] != 0) {
        b = 3;
        break a
      }
      b = HEAP32[a >> 2];
      HEAP32[a + 60 >> 2] = b;
      HEAP32[a + 56 >> 2] = b;
      HEAP32[a + 52 >> 2] = b;
      HEAP32[a + 48 >> 2] = b;
      HEAP32[a + 44 >> 2] = b;
      HEAP32[a + 40 >> 2] = b;
      HEAP32[a + 36 >> 2] = b;
      HEAP32[a + 32 >> 2] = b;
      HEAP32[a + 28 >> 2] = b;
      HEAP32[a + 24 >> 2] = b;
      HEAP32[a + 20 >> 2] = b;
      HEAP32[a + 16 >> 2] = b;
      HEAP32[a + 12 >> 2] = b;
      HEAP32[a + 8 >> 2] = b;
      HEAP32[a + 4 >> 2] = b;
      b = 7;
      break a
    }
  }while(0);
  a:do {
    if(b == 3) {
      d = HEAP32[a >> 2];
      e = HEAP32[a + 4 >> 2];
      HEAP32[a >> 2] = d + e;
      HEAP32[a + 4 >> 2] = d + (e >> 1);
      HEAP32[a + 8 >> 2] = d - (e >> 1);
      HEAP32[a + 12 >> 2] = d - e;
      d = HEAP32[a + 16 >> 2];
      HEAP32[a + 20 >> 2] = d;
      HEAP32[a + 24 >> 2] = d;
      HEAP32[a + 28 >> 2] = d;
      c = 4;
      for(;;) {
        d = c;
        c = d - 1;
        if(d == 0) {
          break a
        }
        d = HEAP32[a >> 2];
        e = HEAP32[a + 16 >> 2];
        HEAP32[a >> 2] = d + e;
        HEAP32[a + 16 >> 2] = d + (e >> 1);
        HEAP32[a + 32 >> 2] = d - (e >> 1);
        HEAP32[a + 48 >> 2] = d - e;
        a += 4
      }
    }
  }while(0)
}
_Transform.X = 1;
function _h264bsdDecodeVuiParameters(a, b) {
  var c, d, e;
  _H264SwDecMemset(b, 0, 952);
  e = _h264bsdGetBits(a, 1);
  c = e == -1 ? 1 : 2;
  a:do {
    if(c == 1) {
      d = 1
    }else {
      if(c == 2) {
        HEAP32[b >> 2] = e == 1 ? 1 : 0;
        c = HEAP32[b >> 2] != 0 ? 3 : 12;
        do {
          if(c == 3) {
            e = _h264bsdGetBits(a, 8);
            c = e == -1 ? 4 : 5;
            do {
              if(c == 4) {
                d = 1;
                break a
              }else {
                if(c == 5) {
                  HEAP32[b + 4 >> 2] = e;
                  c = HEAP32[b + 4 >> 2] == 255 ? 6 : 11;
                  do {
                    if(c == 6) {
                      e = _h264bsdGetBits(a, 16);
                      c = e == -1 ? 7 : 8;
                      do {
                        if(c == 7) {
                          d = 1;
                          break a
                        }else {
                          if(c == 8) {
                            HEAP32[b + 8 >> 2] = e;
                            e = _h264bsdGetBits(a, 16);
                            c = e == -1 ? 9 : 10;
                            do {
                              if(c == 9) {
                                d = 1;
                                break a
                              }else {
                                c == 10 && (HEAP32[b + 12 >> 2] = e)
                              }
                            }while(0)
                          }
                        }
                      }while(0)
                    }
                  }while(0)
                }
              }
            }while(0)
          }
        }while(0);
        e = _h264bsdGetBits(a, 1);
        c = e == -1 ? 13 : 14;
        do {
          if(c == 13) {
            d = 1
          }else {
            if(c == 14) {
              HEAP32[b + 16 >> 2] = e == 1 ? 1 : 0;
              c = HEAP32[b + 16 >> 2] != 0 ? 15 : 18;
              do {
                if(c == 15) {
                  e = _h264bsdGetBits(a, 1);
                  c = e == -1 ? 16 : 17;
                  do {
                    if(c == 16) {
                      d = 1;
                      break a
                    }else {
                      c == 17 && (HEAP32[b + 20 >> 2] = e == 1 ? 1 : 0)
                    }
                  }while(0)
                }
              }while(0);
              e = _h264bsdGetBits(a, 1);
              c = e == -1 ? 19 : 20;
              do {
                if(c == 19) {
                  d = 1
                }else {
                  if(c == 20) {
                    HEAP32[b + 24 >> 2] = e == 1 ? 1 : 0;
                    c = HEAP32[b + 24 >> 2] != 0 ? 21 : 37;
                    do {
                      if(c == 21) {
                        e = _h264bsdGetBits(a, 3);
                        c = e == -1 ? 22 : 23;
                        do {
                          if(c == 22) {
                            d = 1;
                            break a
                          }else {
                            if(c == 23) {
                              HEAP32[b + 28 >> 2] = e;
                              e = _h264bsdGetBits(a, 1);
                              c = e == -1 ? 24 : 25;
                              do {
                                if(c == 24) {
                                  d = 1;
                                  break a
                                }else {
                                  if(c == 25) {
                                    HEAP32[b + 32 >> 2] = e == 1 ? 1 : 0;
                                    e = _h264bsdGetBits(a, 1);
                                    c = e == -1 ? 26 : 27;
                                    do {
                                      if(c == 26) {
                                        d = 1;
                                        break a
                                      }else {
                                        if(c == 27) {
                                          HEAP32[b + 36 >> 2] = e == 1 ? 1 : 0;
                                          c = HEAP32[b + 36 >> 2] != 0 ? 28 : 35;
                                          do {
                                            if(c == 28) {
                                              e = _h264bsdGetBits(a, 8);
                                              c = e == -1 ? 29 : 30;
                                              do {
                                                if(c == 29) {
                                                  d = 1;
                                                  break a
                                                }else {
                                                  if(c == 30) {
                                                    HEAP32[b + 40 >> 2] = e;
                                                    e = _h264bsdGetBits(a, 8);
                                                    c = e == -1 ? 31 : 32;
                                                    do {
                                                      if(c == 31) {
                                                        d = 1;
                                                        break a
                                                      }else {
                                                        if(c == 32) {
                                                          HEAP32[b + 44 >> 2] = e;
                                                          e = _h264bsdGetBits(a, 8);
                                                          c = e == -1 ? 33 : 34;
                                                          do {
                                                            if(c == 33) {
                                                              d = 1;
                                                              break a
                                                            }else {
                                                              c == 34 && (HEAP32[b + 48 >> 2] = e)
                                                            }
                                                          }while(0)
                                                        }
                                                      }
                                                    }while(0)
                                                  }
                                                }
                                              }while(0)
                                            }else {
                                              c == 35 && (HEAP32[b + 40 >> 2] = 2, HEAP32[b + 44 >> 2] = 2, HEAP32[b + 48 >> 2] = 2)
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }
                              }while(0)
                            }
                          }
                        }while(0)
                      }else {
                        c == 37 && (HEAP32[b + 28 >> 2] = 5, HEAP32[b + 40 >> 2] = 2, HEAP32[b + 44 >> 2] = 2, HEAP32[b + 48 >> 2] = 2)
                      }
                    }while(0);
                    e = _h264bsdGetBits(a, 1);
                    c = e == -1 ? 39 : 40;
                    do {
                      if(c == 39) {
                        d = 1
                      }else {
                        if(c == 40) {
                          HEAP32[b + 52 >> 2] = e == 1 ? 1 : 0;
                          c = HEAP32[b + 52 >> 2] != 0 ? 41 : 50;
                          do {
                            if(c == 41) {
                              e = _h264bsdDecodeExpGolombUnsigned(a, b + 56);
                              c = e != 0 ? 42 : 43;
                              do {
                                if(c == 42) {
                                  d = e;
                                  break a
                                }else {
                                  if(c == 43) {
                                    c = HEAPU32[b + 56 >> 2] > 5 ? 44 : 45;
                                    do {
                                      if(c == 44) {
                                        d = 1;
                                        break a
                                      }else {
                                        if(c == 45) {
                                          e = _h264bsdDecodeExpGolombUnsigned(a, b + 60);
                                          c = e != 0 ? 46 : 47;
                                          do {
                                            if(c == 46) {
                                              d = e;
                                              break a
                                            }else {
                                              if(c == 47) {
                                                c = HEAPU32[b + 60 >> 2] > 5 ? 48 : 49;
                                                do {
                                                  if(c == 48) {
                                                    d = 1;
                                                    break a
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }
                              }while(0)
                            }
                          }while(0);
                          e = _h264bsdGetBits(a, 1);
                          c = e == -1 ? 51 : 52;
                          do {
                            if(c == 51) {
                              d = 1
                            }else {
                              if(c == 52) {
                                HEAP32[b + 64 >> 2] = e == 1 ? 1 : 0;
                                c = HEAP32[b + 64 >> 2] != 0 ? 53 : 64;
                                do {
                                  if(c == 53) {
                                    e = _h264bsdShowBits32(a);
                                    c = _h264bsdFlushBits(a, 32) == -1 ? 54 : 55;
                                    do {
                                      if(c == 54) {
                                        d = 1;
                                        break a
                                      }else {
                                        if(c == 55) {
                                          c = e == 0 ? 56 : 57;
                                          do {
                                            if(c == 56) {
                                              d = 1;
                                              break a
                                            }else {
                                              if(c == 57) {
                                                HEAP32[b + 68 >> 2] = e;
                                                e = _h264bsdShowBits32(a);
                                                c = _h264bsdFlushBits(a, 32) == -1 ? 58 : 59;
                                                do {
                                                  if(c == 58) {
                                                    d = 1;
                                                    break a
                                                  }else {
                                                    if(c == 59) {
                                                      c = e == 0 ? 60 : 61;
                                                      do {
                                                        if(c == 60) {
                                                          d = 1;
                                                          break a
                                                        }else {
                                                          if(c == 61) {
                                                            HEAP32[b + 72 >> 2] = e;
                                                            e = _h264bsdGetBits(a, 1);
                                                            c = e == -1 ? 62 : 63;
                                                            do {
                                                              if(c == 62) {
                                                                d = 1;
                                                                break a
                                                              }else {
                                                                c == 63 && (HEAP32[b + 76 >> 2] = e == 1 ? 1 : 0)
                                                              }
                                                            }while(0)
                                                          }
                                                        }
                                                      }while(0)
                                                    }
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }while(0);
                                e = _h264bsdGetBits(a, 1);
                                c = e == -1 ? 65 : 66;
                                do {
                                  if(c == 65) {
                                    d = 1
                                  }else {
                                    if(c == 66) {
                                      HEAP32[b + 80 >> 2] = e == 1 ? 1 : 0;
                                      c = HEAP32[b + 80 >> 2] != 0 ? 67 : 70;
                                      do {
                                        if(c == 67) {
                                          e = _DecodeHrdParameters(a, b + 84);
                                          c = e != 0 ? 68 : 69;
                                          do {
                                            if(c == 68) {
                                              d = e;
                                              break a
                                            }
                                          }while(0)
                                        }else {
                                          c == 70 && (HEAP32[b + 84 >> 2] = 1, HEAP32[b + 96 >> 2] = 288000001, HEAP32[b + 224 >> 2] = 288000001, HEAP32[b + 480 >> 2] = 24, HEAP32[b + 484 >> 2] = 24, HEAP32[b + 488 >> 2] = 24, HEAP32[b + 492 >> 2] = 24)
                                        }
                                      }while(0);
                                      e = _h264bsdGetBits(a, 1);
                                      c = e == -1 ? 72 : 73;
                                      do {
                                        if(c == 72) {
                                          d = 1
                                        }else {
                                          if(c == 73) {
                                            HEAP32[b + 496 >> 2] = e == 1 ? 1 : 0;
                                            c = HEAP32[b + 496 >> 2] != 0 ? 74 : 77;
                                            do {
                                              if(c == 74) {
                                                e = _DecodeHrdParameters(a, b + 500);
                                                c = e != 0 ? 75 : 76;
                                                do {
                                                  if(c == 75) {
                                                    d = e;
                                                    break a
                                                  }
                                                }while(0)
                                              }else {
                                                c == 77 && (HEAP32[b + 500 >> 2] = 1, HEAP32[b + 512 >> 2] = 240000001, HEAP32[b + 640 >> 2] = 240000001, HEAP32[b + 896 >> 2] = 24, HEAP32[b + 900 >> 2] = 24, HEAP32[b + 904 >> 2] = 24, HEAP32[b + 908 >> 2] = 24)
                                              }
                                            }while(0);
                                            c = HEAP32[b + 80 >> 2] != 0 ? 80 : 79;
                                            h:do {
                                              if(c == 79) {
                                                c = HEAP32[b + 496 >> 2] != 0 ? 80 : 83;
                                                break h
                                              }
                                            }while(0);
                                            do {
                                              if(c == 80) {
                                                e = _h264bsdGetBits(a, 1);
                                                c = e == -1 ? 81 : 82;
                                                do {
                                                  if(c == 81) {
                                                    d = 1;
                                                    break a
                                                  }else {
                                                    c == 82 && (HEAP32[b + 912 >> 2] = e == 1 ? 1 : 0)
                                                  }
                                                }while(0)
                                              }
                                            }while(0);
                                            e = _h264bsdGetBits(a, 1);
                                            c = e == -1 ? 84 : 85;
                                            do {
                                              if(c == 84) {
                                                d = 1
                                              }else {
                                                if(c == 85) {
                                                  HEAP32[b + 916 >> 2] = e == 1 ? 1 : 0;
                                                  e = _h264bsdGetBits(a, 1);
                                                  c = e == -1 ? 86 : 87;
                                                  do {
                                                    if(c == 86) {
                                                      d = 1
                                                    }else {
                                                      if(c == 87) {
                                                        HEAP32[b + 920 >> 2] = e == 1 ? 1 : 0;
                                                        c = HEAP32[b + 920 >> 2] != 0 ? 88 : 111;
                                                        do {
                                                          if(c == 88) {
                                                            e = _h264bsdGetBits(a, 1);
                                                            c = e == -1 ? 89 : 90;
                                                            do {
                                                              if(c == 89) {
                                                                d = 1;
                                                                break a
                                                              }else {
                                                                if(c == 90) {
                                                                  HEAP32[b + 924 >> 2] = e == 1 ? 1 : 0;
                                                                  e = _h264bsdDecodeExpGolombUnsigned(a, b + 928);
                                                                  c = e != 0 ? 91 : 92;
                                                                  do {
                                                                    if(c == 91) {
                                                                      d = e;
                                                                      break a
                                                                    }else {
                                                                      if(c == 92) {
                                                                        c = HEAPU32[b + 928 >> 2] > 16 ? 93 : 94;
                                                                        do {
                                                                          if(c == 93) {
                                                                            d = 1;
                                                                            break a
                                                                          }else {
                                                                            if(c == 94) {
                                                                              e = _h264bsdDecodeExpGolombUnsigned(a, b + 932);
                                                                              c = e != 0 ? 95 : 96;
                                                                              do {
                                                                                if(c == 95) {
                                                                                  d = e;
                                                                                  break a
                                                                                }else {
                                                                                  if(c == 96) {
                                                                                    c = HEAPU32[b + 932 >> 2] > 16 ? 97 : 98;
                                                                                    do {
                                                                                      if(c == 97) {
                                                                                        d = 1;
                                                                                        break a
                                                                                      }else {
                                                                                        if(c == 98) {
                                                                                          e = _h264bsdDecodeExpGolombUnsigned(a, b + 936);
                                                                                          c = e != 0 ? 99 : 100;
                                                                                          do {
                                                                                            if(c == 99) {
                                                                                              d = e;
                                                                                              break a
                                                                                            }else {
                                                                                              if(c == 100) {
                                                                                                c = HEAPU32[b + 936 >> 2] > 16 ? 101 : 102;
                                                                                                do {
                                                                                                  if(c == 101) {
                                                                                                    d = 1;
                                                                                                    break a
                                                                                                  }else {
                                                                                                    if(c == 102) {
                                                                                                      e = _h264bsdDecodeExpGolombUnsigned(a, b + 940);
                                                                                                      c = e != 0 ? 103 : 104;
                                                                                                      do {
                                                                                                        if(c == 103) {
                                                                                                          d = e;
                                                                                                          break a
                                                                                                        }else {
                                                                                                          if(c == 104) {
                                                                                                            c = HEAPU32[b + 940 >> 2] > 16 ? 105 : 106;
                                                                                                            do {
                                                                                                              if(c == 105) {
                                                                                                                d = 1;
                                                                                                                break a
                                                                                                              }else {
                                                                                                                if(c == 106) {
                                                                                                                  e = _h264bsdDecodeExpGolombUnsigned(a, b + 944);
                                                                                                                  c = e != 0 ? 107 : 108;
                                                                                                                  do {
                                                                                                                    if(c == 107) {
                                                                                                                      d = e;
                                                                                                                      break a
                                                                                                                    }else {
                                                                                                                      if(c == 108) {
                                                                                                                        e = _h264bsdDecodeExpGolombUnsigned(a, b + 948);
                                                                                                                        c = e != 0 ? 109 : 110;
                                                                                                                        do {
                                                                                                                          if(c == 109) {
                                                                                                                            d = e;
                                                                                                                            break a
                                                                                                                          }
                                                                                                                        }while(0)
                                                                                                                      }
                                                                                                                    }
                                                                                                                  }while(0)
                                                                                                                }
                                                                                                              }
                                                                                                            }while(0)
                                                                                                          }
                                                                                                        }
                                                                                                      }while(0)
                                                                                                    }
                                                                                                  }
                                                                                                }while(0)
                                                                                              }
                                                                                            }
                                                                                          }while(0)
                                                                                        }
                                                                                      }
                                                                                    }while(0)
                                                                                  }
                                                                                }
                                                                              }while(0)
                                                                            }
                                                                          }
                                                                        }while(0)
                                                                      }
                                                                    }
                                                                  }while(0)
                                                                }
                                                              }
                                                            }while(0)
                                                          }else {
                                                            c == 111 && (HEAP32[b + 924 >> 2] = 1, HEAP32[b + 928 >> 2] = 2, HEAP32[b + 932 >> 2] = 1, HEAP32[b + 936 >> 2] = 16, HEAP32[b + 940 >> 2] = 16, HEAP32[b + 944 >> 2] = 16, HEAP32[b + 948 >> 2] = 16)
                                                          }
                                                        }while(0);
                                                        d = 0
                                                      }
                                                    }
                                                  }while(0)
                                                }
                                              }
                                            }while(0)
                                          }
                                        }
                                      }while(0)
                                    }
                                  }
                                }while(0)
                              }
                            }
                          }while(0)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  return d
}
_h264bsdDecodeVuiParameters.X = 1;
function _h264bsdDecodePicOrderCnt(a, b, c, d) {
  var e, f, g, h, j, l, k, m, n;
  n = 0;
  e = HEAP32[c + 284 >> 2] != 0 ? 1 : 7;
  do {
    if(e == 1) {
      f = 0;
      b:for(;;) {
        if(HEAP32[c + 288 + f * 20 >> 2] == 0) {
          e = 6;
          break b
        }
        if(HEAP32[c + 288 + f * 20 >> 2] == 5) {
          e = 4;
          break b
        }
        f += 1
      }
      e == 4 && (n = 1)
    }
  }while(0);
  e = HEAP32[b + 16 >> 2];
  e = e == 0 ? 8 : e == 1 ? 31 : 64;
  do {
    if(e == 64) {
      e = HEAP32[d >> 2] == 5 ? 65 : 66, e == 65 ? h = 0 : e == 66 && (e = HEAPU32[a + 8 >> 2] > HEAPU32[c + 12 >> 2] ? 67 : 68, e == 67 ? h = HEAP32[a + 12 >> 2] + HEAP32[b + 12 >> 2] : e == 68 && (h = HEAP32[a + 12 >> 2])), e = HEAP32[d >> 2] == 5 ? 71 : 72, e == 71 ? g = 0 : e == 72 && (e = HEAP32[d + 4 >> 2] == 0 ? 73 : 74, e == 73 ? g = (h + HEAP32[c + 12 >> 2] << 1) - 1 : e == 74 && (g = h + HEAP32[c + 12 >> 2] << 1)), e = n != 0 ? 78 : 77, e == 78 ? (HEAP32[a + 12 >> 2] = 0, g = HEAP32[a + 
      8 >> 2] = 0) : e == 77 && (HEAP32[a + 12 >> 2] = h, HEAP32[a + 8 >> 2] = HEAP32[c + 12 >> 2])
    }else {
      if(e == 8) {
        e = HEAP32[d >> 2] == 5 ? 9 : 10;
        e == 9 && (HEAP32[a + 4 >> 2] = 0, HEAP32[a >> 2] = 0);
        e = HEAPU32[c + 20 >> 2] < HEAPU32[a >> 2] ? 11 : 13;
        b:do {
          if(e == 11) {
            if(!(HEAP32[a >> 2] - HEAP32[c + 20 >> 2] >= Math.floor(HEAPU32[b + 20 >> 2] / 2))) {
              e = 13;
              break b
            }
            g = HEAP32[a + 4 >> 2] + HEAP32[b + 20 >> 2];
            e = 18;
            break b
          }
        }while(0);
        do {
          if(e == 13) {
            e = HEAPU32[c + 20 >> 2] > HEAPU32[a >> 2] ? 14 : 16;
            c:do {
              if(e == 14) {
                if(!(HEAP32[c + 20 >> 2] - HEAP32[a >> 2] > Math.floor(HEAPU32[b + 20 >> 2] / 2))) {
                  e = 16;
                  break c
                }
                g = HEAP32[a + 4 >> 2] - HEAP32[b + 20 >> 2];
                e = 17;
                break c
              }
            }while(0);
            e == 16 && (g = HEAP32[a + 4 >> 2])
          }
        }while(0);
        e = HEAP32[d + 4 >> 2] != 0 ? 19 : 20;
        e == 19 && (HEAP32[a + 4 >> 2] = g);
        g += HEAP32[c + 20 >> 2];
        e = HEAP32[c + 24 >> 2] < 0 ? 21 : 22;
        e == 21 && (g += HEAP32[c + 24 >> 2]);
        e = HEAP32[d + 4 >> 2] != 0 ? 23 : 30;
        e == 23 && (e = n != 0 ? 24 : 28, e == 24 ? (HEAP32[a + 4 >> 2] = 0, e = HEAP32[c + 24 >> 2] < 0 ? 25 : 26, e == 25 ? HEAP32[a >> 2] = -HEAP32[c + 24 >> 2] : e == 26 && (HEAP32[a >> 2] = 0), g = 0) : e == 28 && (HEAP32[a >> 2] = HEAP32[c + 20 >> 2]))
      }else {
        if(e == 31) {
          e = HEAP32[d >> 2] == 5 ? 32 : 33;
          e == 32 ? h = 0 : e == 33 && (e = HEAPU32[a + 8 >> 2] > HEAPU32[c + 12 >> 2] ? 34 : 35, e == 34 ? h = HEAP32[a + 12 >> 2] + HEAP32[b + 12 >> 2] : e == 35 && (h = HEAP32[a + 12 >> 2]));
          e = HEAP32[b + 36 >> 2] != 0 ? 38 : 39;
          e == 38 ? j = h + HEAP32[c + 12 >> 2] : e == 39 && (j = 0);
          e = HEAP32[d + 4 >> 2] == 0 ? 41 : 43;
          b:do {
            if(e == 41) {
              if(!(j > 0)) {
                break b
              }
              j -= 1
            }
          }while(0);
          e = j > 0 ? 44 : 45;
          e == 44 && (l = Math.floor((j - 1) / HEAPU32[b + 36 >> 2]), k = (j - 1) % HEAPU32[b + 36 >> 2]);
          f = m = 0;
          b:for(;;) {
            if(!(f < HEAPU32[b + 36 >> 2])) {
              break b
            }
            m += HEAP32[HEAP32[b + 40 >> 2] + (f << 2) >> 2];
            f += 1
          }
          e = j > 0 ? 50 : 55;
          do {
            if(e == 50) {
              g = l * m;
              f = 0;
              c:for(;;) {
                if(!(f <= k)) {
                  e = 54;
                  break c
                }
                g += HEAP32[HEAP32[b + 40 >> 2] + (f << 2) >> 2];
                f += 1
              }
            }else {
              e == 55 && (g = 0)
            }
          }while(0);
          e = HEAP32[d + 4 >> 2] == 0 ? 57 : 58;
          e == 57 && (g += HEAP32[b + 28 >> 2]);
          g += HEAP32[c + 28 >> 2];
          e = HEAP32[b + 32 >> 2] + HEAP32[c + 32 >> 2] < 0 ? 59 : 60;
          e == 59 && (g += HEAP32[b + 32 >> 2] + HEAP32[c + 32 >> 2]);
          e = n != 0 ? 62 : 61;
          e == 62 ? (HEAP32[a + 12 >> 2] = 0, g = HEAP32[a + 8 >> 2] = 0) : e == 61 && (HEAP32[a + 12 >> 2] = h, HEAP32[a + 8 >> 2] = HEAP32[c + 12 >> 2])
        }
      }
    }
  }while(0);
  return g
}
_h264bsdDecodePicOrderCnt.X = 1;
function _DecodeHrdParameters(a, b) {
  var c, d, e, f;
  e = _h264bsdDecodeExpGolombUnsigned(a, b);
  c = e != 0 ? 1 : 2;
  do {
    if(c == 1) {
      d = e
    }else {
      if(c == 2) {
        HEAP32[b >> 2] += 1;
        c = HEAPU32[b >> 2] > 32 ? 3 : 4;
        do {
          if(c == 3) {
            d = 1
          }else {
            if(c == 4) {
              e = _h264bsdGetBits(a, 4);
              c = e == -1 ? 5 : 6;
              do {
                if(c == 5) {
                  d = 1
                }else {
                  if(c == 6) {
                    HEAP32[b + 4 >> 2] = e;
                    e = _h264bsdGetBits(a, 4);
                    c = e == -1 ? 7 : 8;
                    do {
                      if(c == 7) {
                        d = 1
                      }else {
                        if(c == 8) {
                          HEAP32[b + 8 >> 2] = e;
                          f = 0;
                          e:for(;;) {
                            if(!(f < HEAPU32[b >> 2])) {
                              c = 22;
                              break e
                            }
                            e = _h264bsdDecodeExpGolombUnsigned(a, b + 12 + (f << 2));
                            if(e != 0) {
                              c = 11;
                              break e
                            }
                            if(HEAPU32[b + 12 + (f << 2) >> 2] > 4294967294) {
                              c = 13;
                              break e
                            }
                            HEAP32[b + 12 + (f << 2) >> 2] += 1;
                            HEAP32[b + 12 + (f << 2) >> 2] *= 1 << HEAP32[b + 4 >> 2] + 6;
                            e = _h264bsdDecodeExpGolombUnsigned(a, b + 140 + (f << 2));
                            if(e != 0) {
                              c = 15;
                              break e
                            }
                            if(HEAPU32[b + 140 + (f << 2) >> 2] > 4294967294) {
                              c = 17;
                              break e
                            }
                            HEAP32[b + 140 + (f << 2) >> 2] += 1;
                            HEAP32[b + 140 + (f << 2) >> 2] *= 1 << HEAP32[b + 8 >> 2] + 4;
                            e = _h264bsdGetBits(a, 1);
                            if(e == -1) {
                              c = 19;
                              break e
                            }
                            HEAP32[b + 268 + (f << 2) >> 2] = e == 1 ? 1 : 0;
                            f += 1
                          }
                          c == 22 ? (e = _h264bsdGetBits(a, 5), c = e == -1 ? 23 : 24, c == 23 ? d = 1 : c == 24 && (HEAP32[b + 396 >> 2] = e + 1, e = _h264bsdGetBits(a, 5), c = e == -1 ? 25 : 26, c == 25 ? d = 1 : c == 26 && (HEAP32[b + 400 >> 2] = e + 1, e = _h264bsdGetBits(a, 5), c = e == -1 ? 27 : 28, c == 27 ? d = 1 : c == 28 && (HEAP32[b + 404 >> 2] = e + 1, e = _h264bsdGetBits(a, 5), c = e == -1 ? 29 : 30, c == 29 ? d = 1 : c == 30 && (HEAP32[b + 408 >> 2] = e, d = 0))))) : c == 11 ? d = e : 
                          c == 13 ? d = 1 : c == 15 ? d = e : c == 17 ? d = 1 : c == 19 && (d = 1)
                        }
                      }
                    }while(0)
                  }
                }
              }while(0)
            }
          }
        }while(0)
      }
    }
  }while(0);
  return d
}
_DecodeHrdParameters.X = 1;
function _h264bsdInit(a, b) {
  var c, d;
  _h264bsdInitStorage(a);
  c = _H264SwDecMalloc(2112);
  HEAP32[a + 3376 >> 2] = c;
  c = HEAP32[a + 3376 >> 2] != 0 ? 2 : 1;
  c == 2 ? ((b != 0 ? 3 : 4) == 3 && (HEAP32[a + 1216 >> 2] = 1), d = 0) : c == 1 && (d = 1);
  return d
}
function _h264bsdDecode(a, b, c, d, e) {
  var f = STACKTOP;
  STACKTOP += 204;
  var g, h, j, l = f + 4, k = f + 12, m = f + 104, n = f + 176, q = f + 196, p, o = f + 200;
  p = HEAP32[q >> 2] = 0;
  g = HEAP32[a + 3344 >> 2] != 0 ? 1 : 3;
  a:do {
    if(g == 1) {
      if(b != HEAP32[a + 3348 >> 2]) {
        g = 3;
        break a
      }
      j = n;
      var r, s;
      g = a + 3356;
      r = g + 20;
      if(j % 4 == g % 4) {
        for(;g % 4 !== 0 && g < r;) {
          HEAP8[j++] = HEAP8[g++]
        }
        g >>= 2;
        j >>= 2;
        for(s = r >> 2;g < s;) {
          HEAP32[j++] = HEAP32[g++]
        }
        g <<= 2;
        j <<= 2
      }
      for(;g < r;) {
        HEAP8[j++] = HEAP8[g++]
      }
      HEAP32[n + 4 >> 2] = HEAP32[n >> 2];
      HEAP32[n + 8 >> 2] = 0;
      HEAP32[n + 16 >> 2] = 0;
      HEAP32[e >> 2] = HEAP32[a + 3352 >> 2];
      g = 6;
      break a
    }
  }while(0);
  a:do {
    if(g == 3) {
      j = _h264bsdExtractNalUnit(b, c, n, e);
      g = j != 0 ? 4 : 5;
      do {
        if(g == 4) {
          h = 3;
          g = 87;
          break a
        }else {
          if(g == 5) {
            g = n;
            j = a + 3356;
            r = g + 20;
            if(j % 4 == g % 4) {
              for(;g % 4 !== 0 && g < r;) {
                HEAP8[j++] = HEAP8[g++]
              }
              g >>= 2;
              j >>= 2;
              for(s = r >> 2;g < s;) {
                HEAP32[j++] = HEAP32[g++]
              }
              g <<= 2;
              j <<= 2
            }
            for(;g < r;) {
              HEAP8[j++] = HEAP8[g++]
            }
            HEAP32[a + 3352 >> 2] = HEAP32[e >> 2];
            HEAP32[a + 3348 >> 2] = b;
            g = 6;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  a:do {
    if(g == 6) {
      HEAP32[a + 3344 >> 2] = 0;
      j = _h264bsdDecodeNalUnit(n, l);
      g = j != 0 ? 7 : 8;
      do {
        if(g == 7) {
          h = 3
        }else {
          if(g == 8) {
            g = HEAP32[l >> 2] == 0 ? 10 : 9;
            c:do {
              if(g == 9) {
                if(HEAPU32[l >> 2] >= 13) {
                  g = 10;
                  break c
                }
                j = _h264bsdCheckAccessUnitBoundary(n, l, a, q);
                g = j != 0 ? 12 : 15;
                do {
                  if(g == 12) {
                    g = j == 65520 ? 13 : 14;
                    do {
                      if(g == 13) {
                        h = 4;
                        break a
                      }else {
                        if(g == 14) {
                          h = 3;
                          break a
                        }
                      }
                    }while(0)
                  }else {
                    if(g == 15) {
                      g = HEAP32[q >> 2] != 0 ? 16 : 26;
                      do {
                        if(g == 16) {
                          g = HEAP32[a + 1184 >> 2] != 0 ? 17 : 24;
                          f:do {
                            if(g == 17) {
                              if(HEAP32[a + 16 >> 2] == 0) {
                                g = 24;
                                break f
                              }
                              g = HEAP32[a + 3380 >> 2] != 0 ? 19 : 20;
                              do {
                                if(g == 19) {
                                  h = 3;
                                  break a
                                }else {
                                  if(g == 20) {
                                    g = HEAP32[a + 1188 >> 2] != 0 ? 22 : 21;
                                    g == 22 ? j = _h264bsdConceal(a, a + 1336, HEAP32[a + 1372 >> 2]) : g == 21 && (p = _h264bsdAllocateDpbImage(a + 1220), HEAP32[a + 1336 >> 2] = p, _h264bsdInitRefPicList(a + 1220), j = _h264bsdConceal(a, a + 1336, 0));
                                    p = 1;
                                    HEAP32[e >> 2] = 0;
                                    HEAP32[a + 3344 >> 2] = 1;
                                    g = 25;
                                    break f
                                  }
                                }
                              }while(0)
                            }
                          }while(0);
                          g == 24 && (HEAP32[a + 1188 >> 2] = 0);
                          HEAP32[a + 1180 >> 2] = 0
                        }
                      }while(0);
                      g = p != 0 ? 79 : 27;
                      do {
                        if(g == 27) {
                          b = HEAP32[l >> 2];
                          g = b == 7 ? 28 : b == 8 ? 31 : b == 5 ? 34 : b == 1 ? 35 : b == 6 ? 76 : 77;
                          f:do {
                            if(g == 77) {
                              g = 78;
                              break f
                            }else {
                              if(g == 28) {
                                j = _h264bsdDecodeSeqParamSet(n, k);
                                g = j != 0 ? 29 : 30;
                                do {
                                  if(g == 29) {
                                    _H264SwDecFree(HEAP32[k + 40 >> 2]);
                                    HEAP32[k + 40 >> 2] = 0;
                                    _H264SwDecFree(HEAP32[k + 84 >> 2]);
                                    HEAP32[k + 84 >> 2] = 0;
                                    h = 3;
                                    break a
                                  }else {
                                    if(g == 30) {
                                      j = _h264bsdStoreSeqParamSet(a, k);
                                      g = 78;
                                      break f
                                    }
                                  }
                                }while(0)
                              }else {
                                if(g == 31) {
                                  j = _h264bsdDecodePicParamSet(n, m);
                                  g = j != 0 ? 32 : 33;
                                  do {
                                    if(g == 32) {
                                      _H264SwDecFree(HEAP32[m + 20 >> 2]);
                                      HEAP32[m + 20 >> 2] = 0;
                                      _H264SwDecFree(HEAP32[m + 24 >> 2]);
                                      HEAP32[m + 24 >> 2] = 0;
                                      _H264SwDecFree(HEAP32[m + 28 >> 2]);
                                      HEAP32[m + 28 >> 2] = 0;
                                      _H264SwDecFree(HEAP32[m + 44 >> 2]);
                                      HEAP32[m + 44 >> 2] = 0;
                                      h = 3;
                                      break a
                                    }else {
                                      if(g == 33) {
                                        j = _h264bsdStorePicParamSet(a, m);
                                        g = 78;
                                        break f
                                      }
                                    }
                                  }while(0)
                                }else {
                                  if(g == 34) {
                                    g = 35;
                                    break f
                                  }else {
                                    if(g == 76) {
                                      g = 78;
                                      break f
                                    }
                                  }
                                }
                              }
                            }
                          }while(0);
                          do {
                            if(g == 35) {
                              g = HEAP32[a + 1180 >> 2] != 0 ? 36 : 37;
                              do {
                                if(g == 36) {
                                  h = 0;
                                  break a
                                }else {
                                  if(g == 37) {
                                    HEAP32[a + 1184 >> 2] = 1;
                                    g = _h264bsdIsStartOfPicture(a) != 0 ? 38 : 59;
                                    do {
                                      if(g == 38) {
                                        HEAP32[a + 1204 >> 2] = 0;
                                        HEAP32[a + 1208 >> 2] = d;
                                        _h264bsdCheckPpsId(n, f);
                                        b = HEAP32[a + 8 >> 2];
                                        j = _h264bsdActivateParamSets(a, HEAP32[f >> 2], HEAP32[l >> 2] == 5 ? 1 : 0);
                                        g = j != 0 ? 39 : 42;
                                        do {
                                          if(g == 39) {
                                            HEAP32[a + 4 >> 2] = 256;
                                            HEAP32[a + 12 >> 2] = 0;
                                            HEAP32[a + 8 >> 2] = 32;
                                            HEAP32[a + 16 >> 2] = 0;
                                            HEAP32[a + 3380 >> 2] = 0;
                                            g = j == 65535 ? 40 : 41;
                                            do {
                                              if(g == 40) {
                                                h = 5;
                                                break a
                                              }else {
                                                if(g == 41) {
                                                  h = 4;
                                                  break a
                                                }
                                              }
                                            }while(0)
                                          }else {
                                            if(g == 42) {
                                              g = b != HEAP32[a + 8 >> 2] ? 43 : 58;
                                              do {
                                                if(g == 43) {
                                                  d = 0;
                                                  k = HEAP32[a + 16 >> 2];
                                                  HEAP32[o >> 2] = 1;
                                                  g = HEAPU32[a >> 2] < 32 ? 44 : 45;
                                                  g == 44 && (d = HEAP32[a + 20 + (HEAP32[a >> 2] << 2) >> 2]);
                                                  HEAP32[e >> 2] = 0;
                                                  HEAP32[a + 3344 >> 2] = 1;
                                                  g = HEAP32[l >> 2] == 5 ? 46 : 47;
                                                  g == 46 ? j = _h264bsdCheckPriorPicsFlag(o, n, k, HEAP32[a + 12 >> 2], HEAP32[l >> 2]) : g == 47 && (j = 1);
                                                  g = j != 0 ? 55 : 49;
                                                  k:do {
                                                    if(g == 49) {
                                                      if(HEAP32[o >> 2] != 0) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      if(HEAP32[a + 1276 >> 2] != 0) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      if(d == 0) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      if(HEAP32[d + 52 >> 2] != HEAP32[k + 52 >> 2]) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      if(HEAP32[d + 56 >> 2] != HEAP32[k + 56 >> 2]) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      if(HEAP32[d + 88 >> 2] != HEAP32[k + 88 >> 2]) {
                                                        g = 55;
                                                        break k
                                                      }
                                                      _h264bsdFlushDpb(a + 1220);
                                                      g = 57;
                                                      break k
                                                    }
                                                  }while(0);
                                                  g == 55 && (HEAP32[a + 1280 >> 2] = 0);
                                                  HEAP32[a >> 2] = HEAP32[a + 8 >> 2];
                                                  h = 2;
                                                  break a
                                                }
                                              }while(0)
                                            }
                                          }
                                        }while(0)
                                      }
                                    }while(0);
                                    g = HEAP32[a + 3380 >> 2] != 0 ? 60 : 61;
                                    do {
                                      if(g == 60) {
                                        h = 3;
                                        break a
                                      }else {
                                        if(g == 61) {
                                          j = _h264bsdDecodeSliceHeader(n, a + 2356, HEAP32[a + 16 >> 2], HEAP32[a + 12 >> 2], l);
                                          g = j != 0 ? 62 : 63;
                                          do {
                                            if(g == 62) {
                                              h = 3;
                                              break a
                                            }else {
                                              if(g == 63) {
                                                g = _h264bsdIsStartOfPicture(a) != 0 ? 64 : 69;
                                                do {
                                                  if(g == 64) {
                                                    g = HEAP32[l >> 2] == 5 ? 68 : 65;
                                                    do {
                                                      if(g == 65) {
                                                        j = _h264bsdCheckGapsInFrameNum(a + 1220, HEAP32[a + 2368 >> 2], HEAP32[l + 4 >> 2] != 0 ? 1 : 0, HEAP32[HEAP32[a + 16 >> 2] + 48 >> 2]);
                                                        g = j != 0 ? 66 : 67;
                                                        do {
                                                          if(g == 66) {
                                                            h = 3;
                                                            break a
                                                          }
                                                        }while(0)
                                                      }
                                                    }while(0);
                                                    b = _h264bsdAllocateDpbImage(a + 1220);
                                                    HEAP32[a + 1336 >> 2] = b
                                                  }
                                                }while(0);
                                                g = a + 2356;
                                                j = a + 1368;
                                                r = g + 988;
                                                if(j % 4 == g % 4) {
                                                  for(;g % 4 !== 0 && g < r;) {
                                                    HEAP8[j++] = HEAP8[g++]
                                                  }
                                                  g >>= 2;
                                                  j >>= 2;
                                                  for(s = r >> 2;g < s;) {
                                                    HEAP32[j++] = HEAP32[g++]
                                                  }
                                                  g <<= 2;
                                                  j <<= 2
                                                }
                                                for(;g < r;) {
                                                  HEAP8[j++] = HEAP8[g++]
                                                }
                                                HEAP32[a + 1188 >> 2] = 1;
                                                g = l;
                                                j = a + 1360;
                                                for(r = g + 8;g < r;) {
                                                  HEAP8[j++] = HEAP8[g++]
                                                }
                                                _h264bsdComputeSliceGroupMap(a, HEAP32[a + 1432 >> 2]);
                                                _h264bsdInitRefPicList(a + 1220);
                                                j = _h264bsdReorderRefPicList(a + 1220, a + 1436, HEAP32[a + 1380 >> 2], HEAP32[a + 1412 >> 2]);
                                                g = j != 0 ? 70 : 71;
                                                do {
                                                  if(g == 70) {
                                                    h = 3;
                                                    break a
                                                  }else {
                                                    if(g == 71) {
                                                      j = _h264bsdDecodeSliceData(n, a, a + 1336, a + 1368);
                                                      g = j != 0 ? 72 : 73;
                                                      do {
                                                        if(g == 72) {
                                                          _h264bsdMarkSliceCorrupted(a, HEAP32[a + 1368 >> 2]);
                                                          h = 3;
                                                          break a
                                                        }else {
                                                          g == 73 && (g = _h264bsdIsEndOfPicture(a) != 0 ? 74 : 75, g == 74 && (p = 1, HEAP32[a + 1180 >> 2] = 1))
                                                        }
                                                      }while(0)
                                                    }
                                                  }
                                                }while(0)
                                              }
                                            }
                                          }while(0)
                                        }
                                      }
                                    }while(0)
                                  }
                                }
                              }while(0)
                            }
                          }while(0)
                        }
                      }while(0);
                      g = p != 0 ? 80 : 86;
                      do {
                        if(g == 80) {
                          _h264bsdFilterPicture(a + 1336, HEAP32[a + 1212 >> 2]);
                          _h264bsdResetStorage(a);
                          e = _h264bsdDecodePicOrderCnt(a + 1284, HEAP32[a + 16 >> 2], a + 1368, a + 1360);
                          g = HEAP32[a + 1188 >> 2] != 0 ? 81 : 85;
                          g == 81 && (g = HEAP32[a + 1364 >> 2] != 0 ? 82 : 83, g == 82 ? _h264bsdMarkDecRefPic(a + 1220, a + 1644, a + 1336, HEAP32[a + 1380 >> 2], e, HEAP32[a + 1360 >> 2] == 5 ? 1 : 0, HEAP32[a + 1208 >> 2], HEAP32[a + 1204 >> 2]) : g == 83 && _h264bsdMarkDecRefPic(a + 1220, 0, a + 1336, HEAP32[a + 1380 >> 2], e, HEAP32[a + 1360 >> 2] == 5 ? 1 : 0, HEAP32[a + 1208 >> 2], HEAP32[a + 1204 >> 2]));
                          HEAP32[a + 1184 >> 2] = 0;
                          HEAP32[a + 1188 >> 2] = 0;
                          h = 1;
                          break a
                        }else {
                          if(g == 86) {
                            h = 0;
                            break a
                          }
                        }
                      }while(0)
                    }
                  }
                }while(0)
              }
            }while(0);
            h = 0
          }
        }
      }while(0)
    }
  }while(0);
  STACKTOP = f;
  return h
}
_h264bsdDecode.X = 1;
function _h264bsdShutdown(a) {
  var b, c;
  c = 0;
  a:for(;;) {
    if(!(c < 32)) {
      break a
    }
    b = HEAP32[a + 20 + (c << 2) >> 2] != 0 ? 3 : 4;
    b == 3 && (_H264SwDecFree(HEAP32[HEAP32[a + 20 + (c << 2) >> 2] + 40 >> 2]), HEAP32[HEAP32[a + 20 + (c << 2) >> 2] + 40 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 20 + (c << 2) >> 2] + 84 >> 2]), HEAP32[HEAP32[a + 20 + (c << 2) >> 2] + 84 >> 2] = 0, _H264SwDecFree(HEAP32[a + 20 + (c << 2) >> 2]), HEAP32[a + 20 + (c << 2) >> 2] = 0);
    c += 1
  }
  c = 0;
  a:for(;;) {
    if(!(c < 256)) {
      break a
    }
    b = HEAP32[a + 148 + (c << 2) >> 2] != 0 ? 9 : 10;
    b == 9 && (_H264SwDecFree(HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 20 >> 2]), HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 20 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 24 >> 2]), HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 24 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 28 >> 2]), HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 28 >> 2] = 0, _H264SwDecFree(HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 44 >> 2]), HEAP32[HEAP32[a + 148 + (c << 2) >> 2] + 44 >> 2] = 0, 
    _H264SwDecFree(HEAP32[a + 148 + (c << 2) >> 2]), HEAP32[a + 148 + (c << 2) >> 2] = 0);
    c += 1
  }
  _H264SwDecFree(HEAP32[a + 3376 >> 2]);
  HEAP32[a + 3376 >> 2] = 0;
  _H264SwDecFree(HEAP32[a + 1212 >> 2]);
  HEAP32[a + 1212 >> 2] = 0;
  _H264SwDecFree(HEAP32[a + 1172 >> 2]);
  HEAP32[a + 1172 >> 2] = 0;
  _h264bsdFreeDpb(a + 1220)
}
_h264bsdShutdown.X = 1;
function _h264bsdPicWidth(a) {
  var b, c;
  b = HEAP32[a + 16 >> 2] != 0 ? 1 : 2;
  b == 1 ? c = HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2] : b == 2 && (c = 0);
  return c
}
function _h264bsdPicHeight(a) {
  var b, c;
  b = HEAP32[a + 16 >> 2] != 0 ? 1 : 2;
  b == 1 ? c = HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2] : b == 2 && (c = 0);
  return c
}
function _h264bsdFlushBuffer(a) {
  _h264bsdFlushDpb(a + 1220)
}
function _h264bsdVideoRange(a) {
  var b, c;
  b = HEAP32[a + 16 >> 2] != 0 ? 1 : 6;
  a:do {
    if(b == 1) {
      if(HEAP32[HEAP32[a + 16 >> 2] + 80 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 24 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 32 >> 2] == 0) {
        b = 6;
        break a
      }
      c = 1;
      b = 7;
      break a
    }
  }while(0);
  b == 6 && (c = 0);
  return c
}
function _h264bsdMatrixCoefficients(a) {
  var b, c;
  b = HEAP32[a + 16 >> 2] != 0 ? 1 : 6;
  a:do {
    if(b == 1) {
      if(HEAP32[HEAP32[a + 16 >> 2] + 80 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 24 >> 2] == 0) {
        b = 6;
        break a
      }
      if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 36 >> 2] == 0) {
        b = 6;
        break a
      }
      c = HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 48 >> 2];
      b = 7;
      break a
    }
  }while(0);
  b == 6 && (c = 2);
  return c
}
_h264bsdMatrixCoefficients.X = 1;
function _h264bsdCroppingParams(a, b, c, d, e, f) {
  var g;
  g = HEAP32[a + 16 >> 2] != 0 ? 1 : 3;
  a:do {
    if(g == 1) {
      if(HEAP32[HEAP32[a + 16 >> 2] + 60 >> 2] == 0) {
        g = 3;
        break a
      }
      HEAP32[b >> 2] = 1;
      HEAP32[c >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 64 >> 2] << 1;
      HEAP32[d >> 2] = (HEAP32[HEAP32[a + 16 >> 2] + 52 >> 2] << 4) - (HEAP32[HEAP32[a + 16 >> 2] + 64 >> 2] + HEAP32[HEAP32[a + 16 >> 2] + 68 >> 2] << 1);
      HEAP32[e >> 2] = HEAP32[HEAP32[a + 16 >> 2] + 72 >> 2] << 1;
      HEAP32[f >> 2] = (HEAP32[HEAP32[a + 16 >> 2] + 56 >> 2] << 4) - (HEAP32[HEAP32[a + 16 >> 2] + 72 >> 2] + HEAP32[HEAP32[a + 16 >> 2] + 76 >> 2] << 1);
      g = 4;
      break a
    }
  }while(0);
  g == 3 && (HEAP32[b >> 2] = 0, HEAP32[c >> 2] = 0, HEAP32[d >> 2] = 0, HEAP32[e >> 2] = 0, HEAP32[f >> 2] = 0)
}
_h264bsdCroppingParams.X = 1;
function _h264bsdSampleAspectRatio(a, b, c) {
  var d, e, f;
  f = e = 1;
  d = HEAP32[a + 16 >> 2] != 0 ? 1 : 25;
  a:do {
    if(d == 1) {
      if(HEAP32[HEAP32[a + 16 >> 2] + 80 >> 2] == 0) {
        break a
      }
      if(HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] == 0) {
        break a
      }
      if(HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] >> 2] == 0) {
        break a
      }
      d = HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 4 >> 2];
      d = d == 0 ? 5 : d == 1 ? 6 : d == 2 ? 7 : d == 3 ? 8 : d == 4 ? 9 : d == 5 ? 10 : d == 6 ? 11 : d == 7 ? 12 : d == 8 ? 13 : d == 9 ? 14 : d == 10 ? 15 : d == 11 ? 16 : d == 12 ? 17 : d == 13 ? 18 : d == 255 ? 19 : 23;
      do {
        if(d == 23) {
          f = e = 0
        }else {
          if(d == 5) {
            f = e = 0
          }else {
            if(d == 6) {
              f = e = 1
            }else {
              if(d == 7) {
                e = 12, f = 11
              }else {
                if(d == 8) {
                  e = 10, f = 11
                }else {
                  if(d == 9) {
                    e = 16, f = 11
                  }else {
                    if(d == 10) {
                      e = 40, f = 33
                    }else {
                      if(d == 11) {
                        e = 24, f = 11
                      }else {
                        if(d == 12) {
                          e = 20, f = 11
                        }else {
                          if(d == 13) {
                            e = 32, f = 11
                          }else {
                            if(d == 14) {
                              e = 80, f = 33
                            }else {
                              if(d == 15) {
                                e = 18, f = 11
                              }else {
                                if(d == 16) {
                                  e = 15, f = 11
                                }else {
                                  if(d == 17) {
                                    e = 64, f = 33
                                  }else {
                                    if(d == 18) {
                                      e = 160, f = 99
                                    }else {
                                      if(d == 19) {
                                        e = HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 8 >> 2];
                                        f = HEAP32[HEAP32[HEAP32[a + 16 >> 2] + 84 >> 2] + 12 >> 2];
                                        d = e == 0 ? 21 : 20;
                                        c:do {
                                          if(d == 20) {
                                            d = f == 0 ? 21 : 22;
                                            break c
                                          }
                                        }while(0);
                                        d == 21 && (e = f = 0)
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }while(0)
    }
  }while(0);
  HEAP32[b >> 2] = e;
  HEAP32[c >> 2] = f
}
_h264bsdSampleAspectRatio.X = 1;
function _h264bsdProfile(a) {
  var b, c;
  b = HEAP32[a + 16 >> 2] != 0 ? 1 : 2;
  b == 1 ? c = HEAP32[HEAP32[a + 16 >> 2] >> 2] : b == 2 && (c = 0);
  return c
}
function _H264SwDecRelease(a) {
  var b;
  b = a == 0 ? 1 : 2;
  b != 1 && b == 2 && (_h264bsdShutdown(a + 8), _H264SwDecFree(a))
}
function _h264bsdNextOutputPicture(a, b, c, d) {
  var e, f;
  f = _h264bsdDpbOutputPicture(a + 1220);
  a = f != 0 ? 1 : 2;
  a == 1 ? (HEAP32[b >> 2] = HEAP32[f + 4 >> 2], HEAP32[c >> 2] = HEAP32[f + 12 >> 2], HEAP32[d >> 2] = HEAP32[f + 8 >> 2], e = HEAP32[f >> 2]) : a == 2 && (e = 0);
  return e
}
function _h264bsdCheckValidParamSets(a) {
  return _h264bsdValidParamSets(a) == 0 ? 1 : 0
}
function _H264SwDecInit(a, b) {
  var c, d, e;
  c = a == 0 ? 1 : 2;
  c == 1 ? d = -1 : c == 2 && (e = _H264SwDecMalloc(3396), c = e == 0 ? 3 : 4, c == 3 ? d = -4 : c == 4 && (c = _h264bsdInit(e + 8, b), c = c != 0 ? 5 : 6, c == 5 ? (_H264SwDecRelease(e), d = -4) : c == 6 && (HEAP32[e >> 2] = 1, HEAP32[e + 4 >> 2] = 0, HEAP32[a >> 2] = e, d = 0)));
  return d
}
function _H264SwDecGetAPIVersion() {
  var a = STACKTOP;
  STACKTOP += 16;
  var b = a + 8;
  HEAP32[b >> 2] = 2;
  HEAP32[b + 4 >> 2] = 3;
  var c, d;
  c = a;
  for(d = b + 8;b < d;) {
    HEAP8[c++] = HEAP8[b++]
  }
  b = [HEAPU32[a >> 2], HEAPU32[a + 4 >> 2]];
  STACKTOP = a;
  return b.slice(0)
}
function _NextPacket(a) {
  var b, c, d, e, f, g;
  b = HEAP32[_packetize >> 2] != 0 ? 3 : 1;
  a:do {
    if(b == 1) {
      if(HEAP32[_nalUnitStream >> 2] != 0) {
        b = 3;
        break a
      }
      c = 0;
      b = 33;
      break a
    }
  }while(0);
  a:do {
    if(b == 3) {
      d = 0;
      g = HEAP32[a >> 2] + HEAP32[_NextPacket_prevIndex >> 2];
      e = HEAP32[_streamStop >> 2] - g;
      b = e == 0 ? 4 : 5;
      do {
        if(b == 4) {
          c = 0
        }else {
          if(b == 5) {
            c:for(;;) {
              if(b = d, d = b + 1, c = HEAP8[g + b], c != 1 ? b = 8 : (f = 0, b = 9), b == 8 && (f = d < e), !f) {
                break c
              }
            }
            b = d == e ? 12 : 11;
            c:do {
              if(b == 11) {
                if(d < 3) {
                  break c
                }
                b = HEAP32[_nalUnitStream >> 2] != 0 ? 14 : 15;
                b == 14 && (g += d, e -= d, d = 0);
                f = 0;
                d:for(;;) {
                  b = d;
                  d = b + 1;
                  c = HEAP8[g + b];
                  b = c != 0 ? 18 : 17;
                  b == 17 && (f += 1);
                  b = c == 1 ? 19 : 24;
                  do {
                    if(b == 19 && f >= 2) {
                      b = 20;
                      break d
                    }
                  }while(0);
                  b = c != 0 ? 25 : 26;
                  b == 25 && (f = 0);
                  if(d == e) {
                    b = 28;
                    break d
                  }
                }
                b == 20 && (b = f > 3 ? 21 : 22, b == 21 ? (d -= 4, f -= 3) : b == 22 && (d -= f + 1, f = 0));
                HEAP32[a >> 2] = g;
                HEAP32[_NextPacket_prevIndex >> 2] = d;
                b = HEAP32[_nalUnitStream >> 2] != 0 ? 31 : 32;
                b == 31 && (d -= f);
                c = d;
                break a
              }
            }while(0);
            _exit(100);
            throw"Reached an unreachable!";
          }
        }
      }while(0)
    }
  }while(0);
  return c
}
_NextPacket.X = 1;
function _H264SwDecGetInfo(a, b) {
  var c, d;
  c = a == 0 ? 2 : 1;
  a:do {
    if(c == 1) {
      if(b == 0) {
        c = 2;
        break a
      }
      d = a + 8;
      c = HEAP32[d + 16 >> 2] == 0 ? 5 : 4;
      b:do {
        if(c == 4) {
          if(HEAP32[d + 12 >> 2] == 0) {
            break b
          }
          c = _h264bsdPicWidth(d);
          HEAP32[b + 4 >> 2] = c << 4;
          c = _h264bsdPicHeight(d);
          HEAP32[b + 8 >> 2] = c << 4;
          c = _h264bsdVideoRange(d);
          HEAP32[b + 12 >> 2] = c;
          c = _h264bsdMatrixCoefficients(d);
          HEAP32[b + 16 >> 2] = c;
          _h264bsdCroppingParams(d, b + 28, b + 32, b + 36, b + 40, b + 44);
          _h264bsdSampleAspectRatio(d, b + 20, b + 24);
          d = _h264bsdProfile(d);
          HEAP32[b >> 2] = d;
          d = 0;
          c = 7;
          break a
        }
      }while(0);
      d = -6;
      c = 7;
      break a
    }
  }while(0);
  c == 2 && (d = -1);
  return d
}
_H264SwDecGetInfo.X = 1;
function _H264SwDecDecode(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 4;
  var e, f, g, h, j;
  h = 0;
  j = 1;
  e = b == 0 ? 2 : 1;
  a:do {
    if(e == 1) {
      if(c == 0) {
        e = 2;
        break a
      }
      e = HEAP32[b >> 2] == 0 ? 5 : 4;
      b:do {
        if(e == 4) {
          if(HEAP32[b + 4 >> 2] == 0) {
            break b
          }
          f = a;
          e = a == 0 ? 8 : 7;
          c:do {
            if(e == 7) {
              if(HEAP32[f >> 2] == 0) {
                break c
              }
              HEAP32[c >> 2] = 0;
              HEAP32[d >> 2] = 0;
              a = HEAP32[b + 4 >> 2];
              g = HEAP32[b >> 2];
              HEAP32[f + 3392 >> 2] = HEAP32[b + 12 >> 2];
              d:for(;;) {
                e = HEAP32[f >> 2] == 2 ? 11 : 12;
                e == 11 ? (h = 2, HEAP32[f >> 2] = 1) : e == 12 && (h = _h264bsdDecode(f + 8, g, a, HEAP32[b + 8 >> 2], d));
                g += HEAP32[d >> 2];
                e = a - HEAP32[d >> 2] >= 0 ? 14 : 15;
                e == 14 ? a -= HEAP32[d >> 2] : e == 15 && (a = 0);
                HEAP32[c >> 2] = g;
                e = h;
                e = e == 2 ? 17 : e == 1 ? 22 : e == 4 ? 26 : e == 5 ? 30 : 31;
                do {
                  if(e != 31) {
                    if(e == 17) {
                      e = HEAP32[f + 1288 >> 2] != 0 ? 18 : 20;
                      f:do {
                        if(e == 18) {
                          if(HEAP32[f + 1244 >> 2] == HEAP32[f + 1248 >> 2]) {
                            e = 20;
                            break f
                          }
                          HEAP32[f + 1288 >> 2] = 0;
                          HEAP32[f >> 2] = 2;
                          j = 3;
                          a = 0;
                          e = 21;
                          break f
                        }
                      }while(0);
                      e == 20 && (j = 4, a = 0)
                    }else {
                      if(e == 22) {
                        HEAP32[f + 4 >> 2] += 1, e = a == 0 ? 23 : 24, e == 23 ? j = 2 : e == 24 && (j = 3), a = 0
                      }else {
                        if(e == 26) {
                          e = _h264bsdCheckValidParamSets(f + 8) != 0 ? 29 : 27;
                          f:do {
                            if(e == 27) {
                              if(a != 0) {
                                e = 29;
                                break f
                              }
                              j = -2
                            }
                          }while(0)
                        }else {
                          e == 30 && (j = -4, a = 0)
                        }
                      }
                    }
                  }
                }while(0);
                if(a == 0) {
                  break d
                }
              }
              f = j;
              e = 35;
              break a
            }
          }while(0);
          f = -3;
          e = 35;
          break a
        }
      }while(0);
      f = -1;
      e = 35;
      break a
    }
  }while(0);
  e == 2 && (f = -1);
  STACKTOP = d;
  return f
}
_H264SwDecDecode.X = 1;
function _H264SwDecNextPicture(a, b, c) {
  var d = STACKTOP;
  STACKTOP += 12;
  var e, f, g, h = d + 4, j = d + 8;
  e = a == 0 ? 2 : 1;
  a:do {
    if(e == 1) {
      if(b == 0) {
        e = 2;
        break a
      }
      g = a;
      e = c != 0 ? 4 : 5;
      e == 4 && _h264bsdFlushBuffer(g + 8);
      g = _h264bsdNextOutputPicture(g + 8, j, h, d);
      e = g == 0 ? 6 : 7;
      do {
        if(e == 6) {
          f = 0;
          e = 8;
          break a
        }else {
          if(e == 7) {
            HEAP32[b >> 2] = g;
            HEAP32[b + 4 >> 2] = HEAP32[j >> 2];
            HEAP32[b + 8 >> 2] = HEAP32[h >> 2];
            HEAP32[b + 12 >> 2] = HEAP32[d >> 2];
            f = 2;
            e = 8;
            break a
          }
        }
      }while(0)
    }
  }while(0);
  e == 2 && (f = -1);
  STACKTOP = d;
  return f
}
_H264SwDecNextPicture.X = 1;
function _runMainLoop() {
  a:for(;;) {
    if(_mainLoopIteration(), !(HEAPU32[_decInput + 4 >> 2] > 0)) {
      break a
    }
  }
}
function _main(a, b) {
  var c = STACKTOP;
  STACKTOP += 256;
  var d, e, f;
  e = 0;
  var g, h;
  f = c;
  d = f + 256;
  h = 0;
  h < 0 && (h += 256);
  for(h = h + (h << 8) + (h << 16) + h * 16777216;f % 4 !== 0 && f < d;) {
    HEAP8[f++] = 0
  }
  f >>= 2;
  for(g = d >> 2;f < g;) {
    HEAP32[f++] = h
  }
  for(f <<= 2;f < d;) {
    HEAP8[f++] = 0
  }
  f = _H264SwDecGetAPIVersion();
  HEAP32[_decVer >> 2] = f.slice(0).slice(0)[0];
  HEAP32[_decVer + 4 >> 2] = f.slice(0).slice(0)[1];
  d = a > 1 ? 1 : 3;
  a:do {
    if(d == 1) {
      if(_strcmp(HEAP32[b + 4 >> 2], __str) != 0) {
        d = 3;
        break a
      }
      e = 0;
      d = 35;
      break a
    }
  }while(0);
  do {
    if(d == 3) {
      d = a < 2 ? 4 : 5;
      do {
        if(d == 4) {
          e = 0
        }else {
          if(d == 5) {
            HEAP32[_i >> 2] = 1;
            c:for(;;) {
              if(!(HEAPU32[_i >> 2] < a - 1)) {
                break c
              }
              d = _strncmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str1, 2) == 0 ? 8 : 9;
              d == 8 ? (f = _atoi(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2] + 2), HEAP32[_maxNumPics >> 2] = f) : d == 9 && (d = _strncmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str2, 2) == 0 ? 10 : 11, d == 10 ? _strcpy(c, HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2] + 2) : d == 11 && (d = _strcmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str3) == 0 ? 12 : 13, d == 12 ? HEAP32[_packetize >> 2] = 1 : d == 13 && (d = _strcmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str4) == 0 ? 14 : 15, d == 14 ? HEAP32[_nalUnitStream >> 
              2] = 1 : d == 15 && (d = _strcmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str5) == 0 ? 16 : 17, d == 16 ? HEAP32[_cropDisplay >> 2] = 1 : d == 17 && (d = _strcmp(HEAP32[b + (HEAP32[_i >> 2] << 2) >> 2], __str6) == 0 ? 18 : 19, d == 18 && (HEAP32[_disableOutputReordering >> 2] = 1))))));
              HEAP32[_i >> 2] += 1
            }
            f = _fopen(HEAP32[b + (a - 1 << 2) >> 2], __str7);
            d = f == 0 ? 27 : 28;
            d == 27 ? e = -1 : d == 28 && (_fseek(f, 0, 2), d = _ftell(f), HEAP32[_strmLen >> 2] = d, _rewind(f), d = _malloc(HEAP32[_strmLen >> 2]), HEAP32[_byteStrmStart >> 2] = d, d = HEAP32[_byteStrmStart >> 2] == 0 ? 29 : 30, d == 29 ? e = -1 : d == 30 && (_fread(HEAP32[_byteStrmStart >> 2], 1, HEAP32[_strmLen >> 2], f), _fclose(f), f = _H264SwDecInit(_decInst, HEAP32[_disableOutputReordering >> 2]), HEAP32[_ret >> 2] = f, d = HEAP32[_ret >> 2] != 0 ? 31 : 32, d == 31 ? e = -1 : d == 32 && (_SDL_Init(32), 
            HEAP32[_streamStop >> 2] = HEAP32[_byteStrmStart >> 2] + HEAP32[_strmLen >> 2], HEAP32[_decInput >> 2] = HEAP32[_byteStrmStart >> 2], HEAP32[_decInput + 4 >> 2] = HEAP32[_strmLen >> 2], HEAP32[_decInput + 12 >> 2] = 0, e = _NextPacket(_decInput), HEAP32[_tmp >> 2] = e, d = e != 0 ? 33 : 34, d == 33 && (HEAP32[_decInput + 4 >> 2] = HEAP32[_tmp >> 2]), HEAP32[_picDisplayNumber >> 2] = 1, HEAP32[_picDecodeNumber >> 2] = 1, _runMainLoop(), e = 0)))
          }
        }
      }while(0)
    }
  }while(0);
  STACKTOP = c;
  return e
}
Module._main = _main;
_main.X = 1;
function _CropPicture(a, b, c, d, e) {
  var f, g, h, j, l;
  f = a == 0 ? 5 : 1;
  a:do {
    if(f == 1) {
      if(b == 0) {
        f = 5;
        break a
      }
      if(e == 0) {
        f = 5;
        break a
      }
      if(c == 0) {
        f = 5;
        break a
      }
      if(d == 0) {
        f = 5;
        break a
      }
      f = HEAP32[e >> 2] + HEAP32[e + 4 >> 2] > c ? 8 : 7;
      b:do {
        if(f == 7) {
          if(HEAP32[e + 8 >> 2] + HEAP32[e + 12 >> 2] > d) {
            break b
          }
          f = HEAP32[e + 4 >> 2];
          j = HEAP32[e + 12 >> 2];
          g = b + HEAP32[e + 8 >> 2] * c + HEAP32[e >> 2];
          l = a;
          a = j;
          c:for(;;) {
            if(a == 0) {
              break c
            }
            h = f;
            d:for(;;) {
              if(h == 0) {
                break d
              }
              var k = g;
              g = k + 1;
              var k = HEAP8[k], m = l;
              l = m + 1;
              HEAP8[m] = k;
              h -= 1
            }
            g += c - f;
            a -= 1
          }
          f >>>= 1;
          j >>>= 1;
          g = b + c * d + Math.floor(HEAP32[e + 8 >> 2] * c / 4) + Math.floor(HEAPU32[e >> 2] / 2);
          a = j;
          c:for(;;) {
            if(a == 0) {
              break c
            }
            h = f;
            d:for(;;) {
              if(h == 0) {
                break d
              }
              k = g;
              g = k + 1;
              k = HEAP8[k];
              m = l;
              l = m + 1;
              HEAP8[m] = k;
              h -= 1
            }
            g += Math.floor(c / 2) - f;
            a -= 1
          }
          g = b + Math.floor(c * 5 * d / 4) + Math.floor(HEAP32[e + 8 >> 2] * c / 4) + Math.floor(HEAPU32[e >> 2] / 2);
          a = j;
          c:for(;;) {
            if(a == 0) {
              break c
            }
            h = f;
            d:for(;;) {
              if(h == 0) {
                break d
              }
              b = g;
              g = b + 1;
              b = HEAP8[b];
              d = l;
              l = d + 1;
              HEAP8[d] = b;
              h -= 1
            }
            g += Math.floor(c / 2) - f;
            a -= 1
          }
          g = 0;
          f = 34;
          break a
        }
      }while(0);
      g = 1;
      f = 34;
      break a
    }
  }while(0);
  f == 5 && (g = 1);
  return g
}
_CropPicture.X = 1;
function _DrawOutput(a, b, c) {
  var d;
  d = b * c;
  _paint(a, a + d, a + d + (d >>> 2), b, c);
  _broadwayOnFrameDecoded()
}
function _terminate() {
  var a, b;
  a:for(;;) {
    if(_H264SwDecNextPicture(HEAP32[_decInst >> 2], _decPicture, 1) != 2) {
      a = 14;
      break a
    }
    HEAP32[_numErrors >> 2] += HEAP32[_decPicture + 12 >> 2];
    HEAP32[_picDisplayNumber >> 2] += 1;
    HEAP32[_imageData >> 2] = HEAP32[_decPicture >> 2];
    a = HEAP32[_cropDisplay >> 2] != 0 ? 8 : 12;
    b:do {
      if(a == 8) {
        if(HEAP32[_decInfo + 28 >> 2] == 0) {
          a = 12;
          break b
        }
        a = _CropPicture(HEAP32[_tmpImage >> 2], HEAP32[_imageData >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2], _decInfo + 32);
        HEAP32[_tmp >> 2] = a;
        if(HEAP32[_tmp >> 2] != 0) {
          a = 10;
          break a
        }
        _DrawOutput(HEAP32[_tmpImage >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2]);
        a = 13;
        break b
      }
    }while(0);
    a == 12 && _DrawOutput(HEAP32[_imageData >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2])
  }
  a:do {
    if(a == 14) {
      _SDL_Quit();
      _H264SwDecRelease(HEAP32[_decInst >> 2]);
      a = HEAP32[_foutput >> 2] != 0 ? 15 : 16;
      a == 15 && _fclose(HEAP32[_foutput >> 2]);
      a = HEAP32[_numErrors >> 2] != 0 ? 18 : 17;
      b:do {
        if(a == 17) {
          if(HEAP32[_picDecodeNumber >> 2] == 1) {
            a = 18;
            break b
          }
          b = 0;
          break a
        }
      }while(0);
      b = 1
    }else {
      a == 10 && (b = -1)
    }
  }while(0);
  return b
}
_terminate.X = 1;
function _mainLoopIteration() {
  var a, b;
  HEAP32[_decInput + 8 >> 2] = HEAP32[_picDecodeNumber >> 2];
  a = _H264SwDecDecode(HEAP32[_decInst >> 2], _decInput, _decOutput);
  HEAP32[_ret >> 2] = a;
  a = HEAP32[_ret >> 2];
  a = a == 4 ? 1 : a == 3 ? 12 : a == 2 ? 13 : a == 1 ? 33 : a == -2 ? 33 : 34;
  a:do {
    if(a == 34) {
      b = -1;
      a = 35;
      break a
    }else {
      if(a == 1) {
        a = _H264SwDecGetInfo(HEAP32[_decInst >> 2], _decInfo);
        HEAP32[_ret >> 2] = a;
        a = HEAP32[_ret >> 2] != 0 ? 2 : 3;
        do {
          if(a == 2) {
            b = -1;
            a = 35;
            break a
          }else {
            if(a == 3) {
              a = HEAP32[_screen >> 2] != 0 ? 5 : 4;
              a == 4 && (a = _SDL_SetVideoMode(HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2], 32, 150994945), HEAP32[_screen >> 2] = a);
              a = HEAP32[_cropDisplay >> 2] != 0 ? 6 : 10;
              c:do {
                if(a == 6) {
                  if(HEAP32[_decInfo + 28 >> 2] == 0) {
                    a = 10;
                    break c
                  }
                  HEAP32[_picSize >> 2] = HEAP32[_decInfo + 36 >> 2] * HEAP32[_decInfo + 44 >> 2];
                  HEAP32[_picSize >> 2] = Math.floor(HEAP32[_picSize >> 2] * 3 / 2);
                  a = _malloc(HEAP32[_picSize >> 2]);
                  HEAP32[_tmpImage >> 2] = a;
                  a = HEAP32[_tmpImage >> 2] == 0 ? 8 : 9;
                  do {
                    if(a == 8) {
                      b = -1;
                      a = 35;
                      break a
                    }else {
                      if(a == 9) {
                        a = 11;
                        break c
                      }
                    }
                  }while(0)
                }
              }while(0);
              a == 10 && (HEAP32[_picSize >> 2] = HEAP32[_decInfo + 4 >> 2] * HEAP32[_decInfo + 8 >> 2], HEAP32[_picSize >> 2] = Math.floor(HEAP32[_picSize >> 2] * 3 / 2));
              HEAP32[_decInput + 4 >> 2] -= HEAP32[_decOutput >> 2] - HEAP32[_decInput >> 2];
              HEAP32[_decInput >> 2] = HEAP32[_decOutput >> 2];
              a = 35;
              break a
            }
          }
        }while(0)
      }else {
        if(a == 12) {
          HEAP32[_decInput + 4 >> 2] -= HEAP32[_decOutput >> 2] - HEAP32[_decInput >> 2];
          HEAP32[_decInput >> 2] = HEAP32[_decOutput >> 2];
          a = 13;
          break a
        }else {
          if(a == 33) {
            a = _NextPacket(_decInput);
            HEAP32[_decInput + 4 >> 2] = a;
            a = 35;
            break a
          }
        }
      }
    }
  }while(0);
  do {
    if(a == 13) {
      a = HEAP32[_ret >> 2] == 2 ? 14 : 15;
      a == 14 && (a = _NextPacket(_decInput), HEAP32[_decInput + 4 >> 2] = a);
      a = HEAP32[_maxNumPics >> 2] != 0 ? 16 : 18;
      b:do {
        if(a == 16) {
          if(HEAP32[_picDecodeNumber >> 2] != HEAP32[_maxNumPics >> 2]) {
            a = 18;
            break b
          }
          HEAP32[_decInput + 4 >> 2] = 0
        }
      }while(0);
      HEAP32[_picDecodeNumber >> 2] += 1;
      b:for(;;) {
        if(_H264SwDecNextPicture(HEAP32[_decInst >> 2], _decPicture, 0) != 2) {
          a = 32;
          break b
        }
        HEAP32[_numErrors >> 2] += HEAP32[_decPicture + 12 >> 2];
        HEAP32[_picDisplayNumber >> 2] += 1;
        HEAP32[_imageData >> 2] = HEAP32[_decPicture >> 2];
        a = HEAP32[_cropDisplay >> 2] != 0 ? 26 : 30;
        c:do {
          if(a == 26) {
            if(HEAP32[_decInfo + 28 >> 2] == 0) {
              a = 30;
              break c
            }
            a = _CropPicture(HEAP32[_tmpImage >> 2], HEAP32[_imageData >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2], _decInfo + 32);
            HEAP32[_tmp >> 2] = a;
            if(HEAP32[_tmp >> 2] != 0) {
              a = 28;
              break b
            }
            _DrawOutput(HEAP32[_tmpImage >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2]);
            a = 31;
            break c
          }
        }while(0);
        a == 30 && _DrawOutput(HEAP32[_imageData >> 2], HEAP32[_decInfo + 4 >> 2], HEAP32[_decInfo + 8 >> 2])
      }
      a != 32 && a == 28 && (b = -1)
    }
  }while(0);
  return b
}
_mainLoopIteration.X = 1;
function _broadwayOnFrameDecoded() {
  _printf(__str8, allocate(1, "i32", ALLOC_STACK))
}
function _broadwaySetPosition(a) {
  _printf(__str9, allocate([a, 0, 0, 0, 0, 0, 0, 0], ["double", 0, 0, 0, 0, 0, 0, 0], ALLOC_STACK))
}
function _broadwayGetPosition() {
  _printf(__str10, allocate(1, "i32", ALLOC_STACK));
  return 0
}
function _H264SwDecTrace(a) {
  _printf(__str11, allocate([a, 0, 0, 0], ["i8*", 0, 0, 0], ALLOC_STACK))
}
function _H264SwDecFree() {
}
function _H264SwDecMemcpy(a, b, c) {
  var d;
  d = b + c;
  if(a % 4 == b % 4 && c > 8) {
    for(;b % 4 !== 0 && b < d;) {
      HEAP8[a++] = HEAP8[b++]
    }
    b >>= 2;
    a >>= 2;
    for(c = d >> 2;b < c;) {
      HEAP32[a++] = HEAP32[b++]
    }
    b <<= 2;
    a <<= 2
  }
  for(;b < d;) {
    HEAP8[a++] = HEAP8[b++]
  }
}
function _H264SwDecMemset(a, b, c) {
  b &= 255;
  var d, e, c = a + c;
  e = b;
  e < 0 && (e += 256);
  for(e = e + (e << 8) + (e << 16) + e * 16777216;a % 4 !== 0 && a < c;) {
    HEAP8[a++] = b
  }
  a >>= 2;
  for(d = c >> 2;a < d;) {
    HEAP32[a++] = e
  }
  for(a <<= 2;a < c;) {
    HEAP8[a++] = b
  }
}
function _H264SwDecMalloc(a) {
  return _malloc(a)
}
var _llvm_dbg_declare;
function _memcpy(a, b, c) {
  var d;
  d = b + c;
  if(a % 4 == b % 4 && c > 8) {
    for(;b % 4 !== 0 && b < d;) {
      HEAP8[a++] = HEAP8[b++]
    }
    b >>= 2;
    a >>= 2;
    for(c = d >> 2;b < c;) {
      HEAP32[a++] = HEAP32[b++]
    }
    b <<= 2;
    a <<= 2
  }
  for(;b < d;) {
    HEAP8[a++] = HEAP8[b++]
  }
}
var _llvm_memcpy_p0i8_p0i8_i32 = _memcpy;
function _memset(a, b, c) {
  var d, c = a + c;
  b < 0 && (b += 256);
  for(b = b + (b << 8) + (b << 16) + b * 16777216;a % 4 !== 0 && a < c;) {
    HEAP8[a++] = b
  }
  a >>= 2;
  for(d = c >> 2;a < d;) {
    HEAP32[a++] = b
  }
  for(a <<= 2;a < c;) {
    HEAP8[a++] = b
  }
}
var _llvm_memset_p0i8_i32 = _memset;
function _strncmp(a, b, c) {
  for(var d = 0;d < c;) {
    var e = HEAP8[a + d], f = HEAP8[b + d];
    if(e == f && e == 0) {
      break
    }
    if(e == 0) {
      return-1
    }
    if(f == 0) {
      return 1
    }
    if(e == f) {
      d++
    }else {
      return e > f ? 1 : -1
    }
  }
  return 0
}
function _strcmp(a, b) {
  return _strncmp(a, b, TOTAL_MEMORY)
}
function _isspace(a) {
  return a in {32:0, 9:0, 10:0, 11:0, 12:0, 13:0}
}
function _isdigit(a) {
  return a >= "0".charCodeAt(0) && a <= "9".charCodeAt(0)
}
function _atoi(a) {
  for(var b;(b = HEAP8[a]) && _isspace(b);) {
    a++
  }
  if(!b || !_isdigit(b)) {
    return 0
  }
  for(var c = a;(b = HEAP8[c]) && _isdigit(b);) {
    c++
  }
  return Math.floor(Number(Pointer_stringify(a).substr(0, c - a)))
}
function _strcpy(a, b) {
  var c = 0;
  do {
    var d, e, f;
    d = b + c;
    e = a + c;
    for(f = d + 1;d < f;) {
      HEAP8[e++] = HEAP8[d++]
    }
    c++
  }while(HEAP8[b + c - 1] != 0);
  return a
}
var ERRNO_CODES = {E2BIG:7, EACCES:13, EADDRINUSE:98, EADDRNOTAVAIL:99, EAFNOSUPPORT:97, EAGAIN:11, EALREADY:114, EBADF:9, EBADMSG:74, EBUSY:16, ECANCELED:125, ECHILD:10, ECONNABORTED:103, ECONNREFUSED:111, ECONNRESET:104, EDEADLK:35, EDESTADDRREQ:89, EDOM:33, EDQUOT:122, EEXIST:17, EFAULT:14, EFBIG:27, EHOSTUNREACH:113, EIDRM:43, EILSEQ:84, EINPROGRESS:115, EINTR:4, EINVAL:22, EIO:5, EISCONN:106, EISDIR:21, ELOOP:40, EMFILE:24, EMLINK:31, EMSGSIZE:90, EMULTIHOP:72, ENAMETOOLONG:36, ENETDOWN:100, 
ENETRESET:102, ENETUNREACH:101, ENFILE:23, ENOBUFS:105, ENODATA:61, ENODEV:19, ENOENT:2, ENOEXEC:8, ENOLCK:37, ENOLINK:67, ENOMEM:12, ENOMSG:42, ENOPROTOOPT:92, ENOSPC:28, ENOSR:63, ENOSTR:60, ENOSYS:38, ENOTCONN:107, ENOTDIR:20, ENOTEMPTY:39, ENOTRECOVERABLE:131, ENOTSOCK:88, ENOTSUP:95, ENOTTY:25, ENXIO:6, EOVERFLOW:75, EOWNERDEAD:130, EPERM:1, EPIPE:32, EPROTO:71, EPROTONOSUPPORT:93, EPROTOTYPE:91, ERANGE:34, EROFS:30, ESPIPE:29, ESRCH:3, ESTALE:116, ETIME:62, ETIMEDOUT:110, ETXTBSY:26, EWOULDBLOCK:11, 
EXDEV:18};
function ___setErrNo(a) {
  if(!___setErrNo.ret) {
    ___setErrNo.ret = allocate([0], "i32", ALLOC_STATIC)
  }
  return HEAP32[___setErrNo.ret >> 2] = a
}
var _stdin = 0, _stdout = 0, _stderr = 0, __impure_ptr = 0, FS = {currentPath:"/", nextInode:2, streams:[null], ignorePermissions:true, absolutePath:function(a, b) {
  if(typeof a !== "string") {
    return null
  }
  if(b === void 0) {
    b = FS.currentPath
  }
  a && a[0] == "/" && (b = "");
  for(var c = (b + "/" + a).split("/").reverse(), d = [""];c.length;) {
    var e = c.pop();
    e == "" || e == "." || (e == ".." ? d.length > 1 && d.pop() : d.push(e))
  }
  return d.length == 1 ? "/" : d.join("/")
}, analyzePath:function(a, b, c) {
  var d = {isRoot:false, exists:false, error:0, name:null, path:null, object:null, parentExists:false, parentPath:null, parentObject:null}, a = FS.absolutePath(a);
  if(a == "/") {
    d.isRoot = true, d.exists = d.parentExists = true, d.name = "/", d.path = d.parentPath = "/", d.object = d.parentObject = FS.root
  }else {
    if(a !== null) {
      for(var c = c || 0, a = a.slice(1).split("/"), e = FS.root, f = [""];a.length;) {
        if(a.length == 1 && e.isFolder) {
          d.parentExists = true, d.parentPath = f.length == 1 ? "/" : f.join("/"), d.parentObject = e, d.name = a[0]
        }
        var g = a.shift();
        if(e.isFolder) {
          if(e.read) {
            if(!e.contents.hasOwnProperty(g)) {
              d.error = ERRNO_CODES.ENOENT;
              break
            }
          }else {
            d.error = ERRNO_CODES.EACCES;
            break
          }
        }else {
          d.error = ERRNO_CODES.ENOTDIR;
          break
        }
        e = e.contents[g];
        if(e.link && !(b && a.length == 0)) {
          if(c > 40) {
            d.error = ERRNO_CODES.ELOOP;
            break
          }
          d = FS.absolutePath(e.link, f.join("/"));
          return FS.analyzePath([d].concat(a).join("/"), b, c + 1)
        }
        f.push(g);
        if(a.length == 0) {
          d.exists = true, d.path = f.join("/"), d.object = e
        }
      }
    }
  }
  return d
}, findObject:function(a, b) {
  FS.ensureRoot();
  var c = FS.analyzePath(a, b);
  return c.exists ? c.object : (___setErrNo(c.error), null)
}, createObject:function(a, b, c, d, e) {
  a || (a = "/");
  typeof a === "string" && (a = FS.findObject(a));
  if(!a) {
    throw ___setErrNo(ERRNO_CODES.EACCES), Error("Parent path must exist.");
  }
  if(!a.isFolder) {
    throw ___setErrNo(ERRNO_CODES.ENOTDIR), Error("Parent must be a folder.");
  }
  if(!a.write && !FS.ignorePermissions) {
    throw ___setErrNo(ERRNO_CODES.EACCES), Error("Parent folder must be writeable.");
  }
  if(!b || b == "." || b == "..") {
    throw ___setErrNo(ERRNO_CODES.ENOENT), Error("Name must not be empty.");
  }
  if(a.contents.hasOwnProperty(b)) {
    throw ___setErrNo(ERRNO_CODES.EEXIST), Error("Can't overwrite object.");
  }
  a.contents[b] = {read:d === void 0 ? true : d, write:e === void 0 ? false : e, timestamp:Date.now(), inodeNumber:FS.nextInode++};
  for(var f in c) {
    c.hasOwnProperty(f) && (a.contents[b][f] = c[f])
  }
  return a.contents[b]
}, createFolder:function(a, b, c, d) {
  return FS.createObject(a, b, {isFolder:true, isDevice:false, contents:{}}, c, d)
}, createPath:function(a, b, c, d) {
  a = FS.findObject(a);
  if(a === null) {
    throw Error("Invalid parent.");
  }
  for(b = b.split("/").reverse();b.length;) {
    var e = b.pop();
    e && (a.contents.hasOwnProperty(e) || FS.createFolder(a, e, c, d), a = a.contents[e])
  }
  return a
}, createFile:function(a, b, c, d, e) {
  c.isFolder = false;
  return FS.createObject(a, b, c, d, e)
}, createDataFile:function(a, b, c, d, e) {
  if(typeof c === "string") {
    for(var f = [], g = 0;g < c.length;g++) {
      f.push(c.charCodeAt(g))
    }
    c = f
  }
  return FS.createFile(a, b, {isDevice:false, contents:c}, d, e)
}, createLazyFile:function(a, b, c, d, e) {
  return FS.createFile(a, b, {isDevice:false, url:c}, d, e)
}, createLink:function(a, b, c, d, e) {
  return FS.createFile(a, b, {isDevice:false, link:c}, d, e)
}, createDevice:function(a, b, c, d) {
  if(!c && !d) {
    throw Error("A device must have at least one callback defined.");
  }
  return FS.createFile(a, b, {isDevice:true, input:c, output:d}, Boolean(c), Boolean(d))
}, forceLoadFile:function(a) {
  if(a.isDevice || a.isFolder || a.link || a.contents) {
    return true
  }
  var b = true;
  if(typeof XMLHttpRequest !== "undefined") {
    var c = new XMLHttpRequest;
    c.open("GET", a.url, false);
    if(typeof Uint8Array != "undefined") {
      c.responseType = "arraybuffer"
    }
    c.overrideMimeType && c.overrideMimeType("text/plain; charset=x-user-defined");
    c.send(null);
    c.status != 200 && c.status != 0 && (b = false);
    a.contents = c.response !== void 0 ? new Uint8Array(c.response || []) : intArrayFromString(c.responseText || "", true)
  }else {
    if(typeof read !== "undefined") {
      try {
        a.contents = intArrayFromString(read(a.url), true)
      }catch(d) {
        b = false
      }
    }else {
      throw Error("Cannot load without read() or XMLHttpRequest.");
    }
  }
  b || ___setErrNo(ERRNO_CODES.EIO);
  return b
}, ensureRoot:function() {
  if(!FS.root) {
    FS.root = {read:true, write:false, isFolder:true, isDevice:false, timestamp:Date.now(), inodeNumber:1, contents:{}}
  }
}, init:function(a, b, c) {
  if(!FS.init.initialized) {
    FS.init.initialized = true;
    FS.ensureRoot();
    a || (a = function() {
      if(!a.cache || !a.cache.length) {
        var b;
        typeof window != "undefined" && typeof window.prompt == "function" ? b = window.prompt("Input: ") : typeof readline == "function" && (b = readline());
        b || (b = "");
        a.cache = intArrayFromString(b + "\n", true)
      }
      return a.cache.shift()
    });
    b || (b = function(a) {
      a === null || a === "\n".charCodeAt(0) ? (b.printer(b.buffer.join("")), b.buffer = []) : b.buffer.push(String.fromCharCode(a))
    });
    if(!b.printer) {
      b.printer = print
    }
    if(!b.buffer) {
      b.buffer = []
    }
    c || (c = b);
    FS.createFolder("/", "tmp", true, true);
    var d = FS.createFolder("/", "dev", true, false), e = FS.createDevice(d, "stdin", a), f = FS.createDevice(d, "stdout", null, b), c = FS.createDevice(d, "stderr", null, c);
    FS.createDevice(d, "tty", a, b);
    FS.streams[1] = {path:"/dev/stdin", object:e, position:0, isRead:true, isWrite:false, isAppend:false, error:false, eof:false, ungotten:[]};
    FS.streams[2] = {path:"/dev/stdout", object:f, position:0, isRead:false, isWrite:true, isAppend:false, error:false, eof:false, ungotten:[]};
    FS.streams[3] = {path:"/dev/stderr", object:c, position:0, isRead:false, isWrite:true, isAppend:false, error:false, eof:false, ungotten:[]};
    _stdin = allocate([1], "void*", ALLOC_STATIC);
    _stdout = allocate([2], "void*", ALLOC_STATIC);
    _stderr = allocate([3], "void*", ALLOC_STATIC);
    FS.streams[_stdin] = FS.streams[1];
    FS.streams[_stdout] = FS.streams[2];
    FS.streams[_stderr] = FS.streams[3];
    __impure_ptr = allocate([allocate([0, 0, 0, 0, _stdin, 0, 0, 0, _stdout, 0, 0, 0, _stderr, 0, 0, 0], "void*", ALLOC_STATIC)], "void*", ALLOC_STATIC)
  }
}, quit:function() {
  FS.init.initialized && (FS.streams[2].object.output.buffer.length > 0 && FS.streams[2].object.output("\n".charCodeAt(0)), FS.streams[3].object.output.buffer.length > 0 && FS.streams[3].object.output("\n".charCodeAt(0)))
}}, ___dirent_struct_layout = null;
function _open(a, b, c) {
  var d = HEAP32[c >> 2], e = b & 3, c = e != 0, e = e != 1, f = Boolean(b & 512), g = Boolean(b & 2048), h = Boolean(b & 1024), j = Boolean(b & 8), a = FS.analyzePath(Pointer_stringify(a));
  if(!a.parentExists) {
    return ___setErrNo(a.error), -1
  }
  if(b = a.object || null) {
    if(f && g) {
      return ___setErrNo(ERRNO_CODES.EEXIST), -1
    }
    if((c || f || h) && b.isFolder) {
      return ___setErrNo(ERRNO_CODES.EISDIR), -1
    }
    if(e && !b.read || c && !b.write) {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
    if(h && !b.isDevice) {
      b.contents = []
    }else {
      if(!FS.forceLoadFile(b)) {
        return ___setErrNo(ERRNO_CODES.EIO), -1
      }
    }
    a = a.path
  }else {
    if(!f) {
      return ___setErrNo(ERRNO_CODES.ENOENT), -1
    }
    if(!a.parentObject.write) {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
    b = FS.createDataFile(a.parentObject, a.name, [], d & 256, d & 128);
    a = a.parentPath + "/" + a.name
  }
  d = FS.streams.length;
  if(b.isFolder) {
    c = 0;
    ___dirent_struct_layout && (c = _malloc(___dirent_struct_layout.__size__));
    var e = [], l;
    for(l in b.contents) {
      e.push(l)
    }
    FS.streams[d] = {path:a, object:b, position:-2, isRead:true, isWrite:false, isAppend:false, error:false, eof:false, ungotten:[], contents:e, currentEntry:c}
  }else {
    FS.streams[d] = {path:a, object:b, position:0, isRead:e, isWrite:c, isAppend:j, error:false, eof:false, ungotten:[]}
  }
  return d
}
function _fopen(a, b) {
  var c, b = Pointer_stringify(b);
  if(b[0] == "r") {
    c = b.indexOf("+") != -1 ? 2 : 0
  }else {
    if(b[0] == "w") {
      c = b.indexOf("+") != -1 ? 2 : 1, c |= 512, c |= 1024
    }else {
      if(b[0] == "a") {
        c = b.indexOf("+") != -1 ? 2 : 1, c |= 512, c |= 8
      }else {
        return ___setErrNo(ERRNO_CODES.EINVAL), 0
      }
    }
  }
  c = _open(a, c, allocate([511, 0, 0, 0], "i32", ALLOC_STACK));
  return c == -1 ? 0 : c
}
function _lseek(a, b, c) {
  return FS.streams[a] && !FS.streams[a].isDevice ? (a = FS.streams[a], c === 1 ? b += a.position : c === 2 && (b += a.object.contents.length), b < 0 ? (___setErrNo(ERRNO_CODES.EINVAL), -1) : (a.ungotten = [], a.position = b)) : (___setErrNo(ERRNO_CODES.EBADF), -1)
}
function _fseek(a, b, c) {
  return _lseek(a, b, c) == -1 ? -1 : (FS.streams[a].eof = false, 0)
}
function _ftell(a) {
  return a in FS.streams ? (a = FS.streams[a], a.object.isDevice ? (___setErrNo(ERRNO_CODES.ESPIPE), -1) : a.position) : (___setErrNo(ERRNO_CODES.EBADF), -1)
}
function _rewind(a) {
  _fseek(a, 0, 0);
  if(a in FS.streams) {
    FS.streams[a].error = false
  }
}
function _malloc(a) {
  return Runtime.staticAlloc(a || 1)
}
function _pread(a, b, c, d) {
  var e = FS.streams[a];
  if(!e || e.object.isDevice) {
    return ___setErrNo(ERRNO_CODES.EBADF), -1
  }else {
    if(e.isRead) {
      if(e.object.isFolder) {
        return ___setErrNo(ERRNO_CODES.EISDIR), -1
      }else {
        if(c < 0 || d < 0) {
          return ___setErrNo(ERRNO_CODES.EINVAL), -1
        }else {
          for(a = 0;e.ungotten.length && c > 0;) {
            HEAP8[b++] = e.ungotten.pop(), c--, a++
          }
          for(var e = e.object.contents, c = Math.min(e.length - d, c), f = 0;f < c;f++) {
            HEAP8[b + f] = e[d + f], a++
          }
          return a
        }
      }
    }else {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
  }
}
function _read(a, b, c) {
  var d = FS.streams[a];
  if(d) {
    if(d.isRead) {
      if(c < 0) {
        return ___setErrNo(ERRNO_CODES.EINVAL), -1
      }else {
        if(d.object.isDevice) {
          if(d.object.input) {
            for(a = 0;d.ungotten.length && c > 0;) {
              HEAP8[b++] = d.ungotten.pop(), c--, a++
            }
            for(var e = 0;e < c;e++) {
              try {
                var f = d.object.input()
              }catch(g) {
                return ___setErrNo(ERRNO_CODES.EIO), -1
              }
              if(f === null || f === void 0) {
                break
              }
              a++;
              HEAP8[b + e] = f
            }
            return a
          }else {
            return ___setErrNo(ERRNO_CODES.ENXIO), -1
          }
        }else {
          return f = d.ungotten.length, a = _pread(a, b, c, d.position), a != -1 && (d.position += d.ungotten.length - f + a), a
        }
      }
    }else {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
  }else {
    return ___setErrNo(ERRNO_CODES.EBADF), -1
  }
}
function _fread(a, b, c, d) {
  c *= b;
  if(c == 0) {
    return 0
  }
  a = _read(d, a, c);
  d = FS.streams[d];
  if(a == -1) {
    if(d) {
      d.error = true
    }
    return-1
  }else {
    if(a < c) {
      d.eof = true
    }
    return Math.floor(a / b)
  }
}
function _close(a) {
  return FS.streams[a] ? (FS.streams[a].currentEntry && _free(FS.streams[a].currentEntry), delete FS.streams[a], 0) : (___setErrNo(ERRNO_CODES.EBADF), -1)
}
function _fsync(a) {
  return FS.streams[a] ? 0 : (___setErrNo(ERRNO_CODES.EBADF), -1)
}
function _fclose(a) {
  _fsync(a);
  return _close(a)
}
function _free() {
}
var Browser = {decodeImage:function(a, b) {
  for(var c = new Image, d = document.createElement("canvas"), e = "", f = 0, g = 0, h = 0;h < a.length;h++) {
    f = f << 8 | a[h];
    for(g += 8;g >= 6;) {
      var j = f >> g - 6 & 63;
      g -= 6;
      e += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[j]
    }
  }
  g == 2 ? (e += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f & 3) << 4], e += "==") : g == 4 && (e += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f & 15) << 2], e += "=");
  c.src = "data:image/" + b + ";base64," + e;
  e = d.getContext("2d");
  e.drawImage(c, 0, 0);
  return e.getImageData(0, 0, d.width, d.height)
}}, SDL = {defaults:{width:320, height:200, copyScreenOnLock:false}, surfaces:{}, events:[], keyCodes:{16:304, 17:305, 18:308, 37:276, 38:273, 39:275, 40:274, 109:45}, structs:{Rect:{__size__:8, x:0, y:2, w:4, h:6}, PixelFormat:{__size__:32, palette:0, BitsPerPixel:4, BytesPerPixel:5, Rloss:6, Gloss:7, Bloss:8, Aloss:9, Rshift:10, Gshift:11, Bshift:12, Ashift:13, Rmask:16, Gmask:20, Bmask:24, Amask:28}, KeyboardEvent:{__size__:8, type:0, which:1, state:2, keysym:4}, keysym:{__size__:16, scancode:0, 
sym:4, mod:8, unicode:12}, AudioSpec:{__size__:24, freq:0, format:4, channels:6, silence:7, samples:8, size:12, callback:16, userdata:20}}, makeSurface:function(a, b, c) {
  var d = _malloc(14 * Runtime.QUANTUM_SIZE), e = _malloc(a * b * 4), f = _malloc(18 * Runtime.QUANTUM_SIZE);
  c |= 1;
  HEAP32[d + Runtime.QUANTUM_SIZE * 0 >> 2] = c;
  HEAP32[d + Runtime.QUANTUM_SIZE * 1 >> 2] = f;
  HEAP32[d + Runtime.QUANTUM_SIZE * 2 >> 2] = a;
  HEAP32[d + Runtime.QUANTUM_SIZE * 3 >> 2] = b;
  HEAP16[d + Runtime.QUANTUM_SIZE * 4 >> 1] = a * 4;
  HEAP32[d + Runtime.QUANTUM_SIZE * 5 >> 2] = e;
  HEAP32[d + Runtime.QUANTUM_SIZE * 6 >> 2] = 0;
  HEAP32[f + SDL.structs.PixelFormat.palette >> 2] = 0;
  HEAP8[f + SDL.structs.PixelFormat.BitsPerPixel] = 32;
  HEAP8[f + SDL.structs.PixelFormat.BytesPerPixel] = 4;
  HEAP32[f + SDL.structs.PixelFormat.Rmask >> 2] = 255;
  HEAP32[f + SDL.structs.PixelFormat.Gmask >> 2] = 255;
  HEAP32[f + SDL.structs.PixelFormat.Bmask >> 2] = 255;
  HEAP32[f + SDL.structs.PixelFormat.Amask >> 2] = 255;
  SDL.surfaces[d] = {width:a, height:b, canvas:Module.canvas, ctx:Module.ctx2D, surf:d, buffer:e, pixelFormat:f, alpha:255};
  return d
}, freeSurface:function(a) {
  _free(SDL.surfaces[a].buffer);
  _free(SDL.surfaces[a].pixelFormat);
  _free(a);
  delete SDL.surfaces[a]
}, receiveEvent:function(a) {
  switch(a.type) {
    case "keydown":
    ;
    case "keyup":
      SDL.events.push(a)
  }
  return false
}, makeCEvent:function(a, b) {
  if(typeof a === "number") {
    _memcpy(b, a, SDL.structs.KeyboardEvent.__size__)
  }else {
    switch(a.type) {
      case "keydown":
      ;
      case "keyup":
        var c = a.type === "keydown", d = SDL.keyCodes[a.keyCode] || a.keyCode;
        d >= 65 && d <= 90 && (d = String.fromCharCode(d).toLowerCase().charCodeAt(0));
        HEAP8[b + SDL.structs.KeyboardEvent.type] = c ? 2 : 3;
        HEAP8[b + SDL.structs.KeyboardEvent.which] = 1;
        HEAP8[b + SDL.structs.KeyboardEvent.state] = c ? 1 : 0;
        HEAP8[b + SDL.structs.KeyboardEvent.keysym + SDL.structs.keysym.scancode] = d;
        HEAP32[b + SDL.structs.KeyboardEvent.keysym + SDL.structs.keysym.sym >> 2] = d;
        HEAP32[b + SDL.structs.KeyboardEvent.keysym + SDL.structs.keysym.mod >> 2] = 0;
        break;
      case "keypress":
        break;
      default:
        throw"Unhandled SDL event: " + a.type;
    }
  }
}};
function _SDL_Init() {
  SDL.startTime = Date.now();
  ["keydown", "keyup", "keypress"].forEach(function(a) {
    addEventListener(a, SDL.receiveEvent, true)
  });
  return 0
}
function _SDL_Quit() {
  print("SDL_Quit called (and ignored)")
}
function _SDL_SetVideoMode(a, b, c, d) {
  Module.canvas.width = a;
  Module.canvas.height = b;
  return SDL.screen = SDL.makeSurface(a, b, d)
}
function _SDL_LockSurface(a) {
  var b = SDL.surfaces[a];
  if(!b.image) {
    b.image = b.ctx.getImageData(0, 0, b.width, b.height);
    for(var c = b.image.data, d = c.length, e = 0;e < d / 4;e++) {
      c[e * 4 + 3] = 255
    }
  }
  if(SDL.defaults.copyScreenOnLock) {
    c = b.image.data.length;
    for(e = 0;e < c;e++) {
      HEAP8[b.buffer + e] = b.image.data[e]
    }
  }
  HEAP32[a + 5 * Runtime.QUANTUM_SIZE >> 2] = b.buffer
}
function _SDL_MapRGB(a, b, c, d) {
  return b + (c << 8) + (d << 16)
}
function _SDL_UnlockSurface(a) {
  var a = SDL.surfaces[a], b = a.image.data.length;
  if(a.colors) {
    for(var b = Module.canvas.width, c = Module.canvas.height, d = a.buffer, e = a.image.data, f = a.colors, g = 0;g < c;g++) {
      for(var h = g * b * 4, j = 0;j < b;j++) {
        var l = HEAP8[d++] & 255, l = f[l] || [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)], k = h + j * 4;
        e[k] = l[0];
        e[k + 1] = l[1];
        e[k + 2] = l[2]
      }
      d += b * 3
    }
  }else {
    var e = a.image.data, l = a.buffer;
    assert(l % 4 == 0, "Invalid buffer offset: " + l);
    c = l >> 2;
    for(d = 0;d < b;) {
      var l = HEAP32[c];
      e[d] = l & 255;
      e[d + 1] = l >> 8 & 255;
      e[d + 2] = l >> 16 & 255;
      e[d + 3] = 255;
      c++;
      d += 4
    }
  }
  a.ctx.putImageData(a.image, 0, 0)
}
function _SDL_Flip() {
}
function _pwrite(a, b, c, d) {
  a = FS.streams[a];
  if(!a || a.object.isDevice) {
    return ___setErrNo(ERRNO_CODES.EBADF), -1
  }else {
    if(a.isWrite) {
      if(a.object.isFolder) {
        return ___setErrNo(ERRNO_CODES.EISDIR), -1
      }else {
        if(c < 0 || d < 0) {
          return ___setErrNo(ERRNO_CODES.EINVAL), -1
        }else {
          for(var e = a.object.contents;e.length < d;) {
            e.push(0)
          }
          for(var f = 0;f < c;f++) {
            e[d + f] = HEAPU8[b + f]
          }
          a.object.timestamp = Date.now();
          return f
        }
      }
    }else {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
  }
}
function _write(a, b, c) {
  var d = FS.streams[a];
  if(d) {
    if(d.isWrite) {
      if(c < 0) {
        return ___setErrNo(ERRNO_CODES.EINVAL), -1
      }else {
        if(d.object.isDevice) {
          if(d.object.output) {
            for(a = 0;a < c;a++) {
              try {
                d.object.output(HEAP8[b + a])
              }catch(e) {
                return ___setErrNo(ERRNO_CODES.EIO), -1
              }
            }
            d.object.timestamp = Date.now();
            return a
          }else {
            return ___setErrNo(ERRNO_CODES.ENXIO), -1
          }
        }else {
          return b = _pwrite(a, b, c, d.position), b != -1 && (d.position += b), b
        }
      }
    }else {
      return ___setErrNo(ERRNO_CODES.EACCES), -1
    }
  }else {
    return ___setErrNo(ERRNO_CODES.EBADF), -1
  }
}
function _fwrite(a, b, c, d) {
  c *= b;
  if(c == 0) {
    return 0
  }
  a = _write(d, a, c);
  if(a == -1) {
    if(FS.streams[d]) {
      FS.streams[d].error = true
    }
    return-1
  }else {
    return Math.floor(a / b)
  }
}
function __formatString(a, b) {
  function c(a) {
    var c;
    a === "float" || a === "double" ? c = (tempDoubleI32[0] = HEAP32[b + e >> 2], tempDoubleI32[1] = HEAP32[b + e + 4 >> 2], tempDoubleF64[0]) : a == "i64" ? (c = [HEAP32[b + e >> 2], HEAP32[b + e + 4 >> 2]], c = unSign(c[0], 32) + unSign(c[1], 32) * Math.pow(2, 32)) : c = HEAP32[b + e >> 2];
    e += Runtime.getNativeFieldSize(a);
    return Number(c)
  }
  for(var d = a, e = 0, f = [], g, h;;) {
    var j = d;
    g = HEAP8[d];
    if(g === 0) {
      break
    }
    h = HEAP8[d + 1];
    if(g == "%".charCodeAt(0)) {
      var l = false, k = false, m = false, n = false;
      a:for(;;) {
        switch(h) {
          case "+".charCodeAt(0):
            l = true;
            break;
          case "-".charCodeAt(0):
            k = true;
            break;
          case "#".charCodeAt(0):
            m = true;
            break;
          case "0".charCodeAt(0):
            if(n) {
              break a
            }else {
              n = true;
              break
            }
          ;
          default:
            break a
        }
        d++;
        h = HEAP8[d + 1]
      }
      var q = 0;
      if(h == "*".charCodeAt(0)) {
        q = c("i32"), d++, h = HEAP8[d + 1]
      }else {
        for(;h >= "0".charCodeAt(0) && h <= "9".charCodeAt(0);) {
          q = q * 10 + (h - "0".charCodeAt(0)), d++, h = HEAP8[d + 1]
        }
      }
      var p = false;
      if(h == ".".charCodeAt(0)) {
        var o = 0, p = true;
        d++;
        h = HEAP8[d + 1];
        if(h == "*".charCodeAt(0)) {
          o = c("i32"), d++
        }else {
          for(;;) {
            h = HEAP8[d + 1];
            if(h < "0".charCodeAt(0) || h > "9".charCodeAt(0)) {
              break
            }
            o = o * 10 + (h - "0".charCodeAt(0));
            d++
          }
        }
        h = HEAP8[d + 1]
      }else {
        o = 6
      }
      var r;
      switch(String.fromCharCode(h)) {
        case "h":
          h = HEAP8[d + 2];
          h == "h".charCodeAt(0) ? (d++, r = 1) : r = 2;
          break;
        case "l":
          h = HEAP8[d + 2];
          h == "l".charCodeAt(0) ? (d++, r = 8) : r = 4;
          break;
        case "L":
        ;
        case "q":
        ;
        case "j":
          r = 8;
          break;
        case "z":
        ;
        case "t":
        ;
        case "I":
          r = 4;
          break;
        default:
          r = null
      }
      r && d++;
      h = HEAP8[d + 1];
      if("d,i,u,o,x,X,p".split(",").indexOf(String.fromCharCode(h)) != -1) {
        j = h == "d".charCodeAt(0) || h == "i".charCodeAt(0);
        r = r || 4;
        g = c("i" + r * 8);
        if(r <= 4) {
          var s = Math.pow(256, r) - 1;
          g = (j ? reSign : unSign)(g & s, r * 8)
        }
        var s = Math.abs(g), t, j = "";
        if(h == "d".charCodeAt(0) || h == "i".charCodeAt(0)) {
          t = reSign(g, 8 * r, 1).toString(10)
        }else {
          if(h == "u".charCodeAt(0)) {
            t = unSign(g, 8 * r, 1).toString(10), g = Math.abs(g)
          }else {
            if(h == "o".charCodeAt(0)) {
              t = (m ? "0" : "") + s.toString(8)
            }else {
              if(h == "x".charCodeAt(0) || h == "X".charCodeAt(0)) {
                j = m ? "0x" : "";
                if(g < 0) {
                  g = -g;
                  t = (s - 1).toString(16);
                  m = [];
                  for(s = 0;s < t.length;s++) {
                    m.push((15 - parseInt(t[s], 16)).toString(16))
                  }
                  for(t = m.join("");t.length < r * 2;) {
                    t = "f" + t
                  }
                }else {
                  t = s.toString(16)
                }
                h == "X".charCodeAt(0) && (j = j.toUpperCase(), t = t.toUpperCase())
              }else {
                h == "p".charCodeAt(0) && (s === 0 ? t = "(nil)" : (j = "0x", t = s.toString(16)))
              }
            }
          }
        }
        if(p) {
          for(;t.length < o;) {
            t = "0" + t
          }
        }
        for(l && (j = g < 0 ? "-" + j : "+" + j);j.length + t.length < q;) {
          k ? t += " " : n ? t = "0" + t : j = " " + j
        }
        t = j + t;
        t.split("").forEach(function(a) {
          f.push(a.charCodeAt(0))
        })
      }else {
        if("f,F,e,E,g,G".split(",").indexOf(String.fromCharCode(h)) != -1) {
          g = c(r === 4 ? "float" : "double");
          if(isNaN(g)) {
            t = "nan", n = false
          }else {
            if(isFinite(g)) {
              p = false;
              r = Math.min(o, 20);
              if(h == "g".charCodeAt(0) || h == "G".charCodeAt(0)) {
                p = true, o = o || 1, r = parseInt(g.toExponential(r).split("e")[1], 10), o > r && r >= -4 ? (h = (h == "g".charCodeAt(0) ? "f" : "F").charCodeAt(0), o -= r + 1) : (h = (h == "g".charCodeAt(0) ? "e" : "E").charCodeAt(0), o--), r = Math.min(o, 20)
              }
              if(h == "e".charCodeAt(0) || h == "E".charCodeAt(0)) {
                t = g.toExponential(r), /[eE][-+]\d$/.test(t) && (t = t.slice(0, -1) + "0" + t.slice(-1))
              }else {
                if(h == "f".charCodeAt(0) || h == "F".charCodeAt(0)) {
                  t = g.toFixed(r)
                }
              }
              j = t.split("e");
              if(p && !m) {
                for(;j[0].length > 1 && j[0].indexOf(".") != -1 && (j[0].slice(-1) == "0" || j[0].slice(-1) == ".");) {
                  j[0] = j[0].slice(0, -1)
                }
              }else {
                for(m && t.indexOf(".") == -1 && (j[0] += ".");o > r++;) {
                  j[0] += "0"
                }
              }
              t = j[0] + (j.length > 1 ? "e" + j[1] : "");
              h == "E".charCodeAt(0) && (t = t.toUpperCase());
              l && g >= 0 && (t = "+" + t)
            }else {
              t = (g < 0 ? "-" : "") + "inf", n = false
            }
          }
          for(;t.length < q;) {
            k ? t += " " : t = n && (t[0] == "-" || t[0] == "+") ? t[0] + "0" + t.slice(1) : (n ? "0" : " ") + t
          }
          h < "a".charCodeAt(0) && (t = t.toUpperCase());
          t.split("").forEach(function(a) {
            f.push(a.charCodeAt(0))
          })
        }else {
          if(h == "s".charCodeAt(0)) {
            (l = c("i8*")) ? (l = String_copy(l), p && l.length > o && (l = l.slice(0, o))) : l = intArrayFromString("(null)", true);
            if(!k) {
              for(;l.length < q--;) {
                f.push(" ".charCodeAt(0))
              }
            }
            f = f.concat(l);
            if(k) {
              for(;l.length < q--;) {
                f.push(" ".charCodeAt(0))
              }
            }
          }else {
            if(h == "c".charCodeAt(0)) {
              for(k && f.push(c("i8"));--q > 0;) {
                f.push(" ".charCodeAt(0))
              }
              k || f.push(c("i8"))
            }else {
              if(h == "n".charCodeAt(0)) {
                k = c("i32*"), HEAP32[k >> 2] = f.length
              }else {
                if(h == "%".charCodeAt(0)) {
                  f.push(g)
                }else {
                  for(s = j;s < d + 2;s++) {
                    f.push(HEAP8[s])
                  }
                }
              }
            }
          }
        }
      }
      d += 2
    }else {
      f.push(g), d += 1
    }
  }
  return f
}
function _fprintf(a, b, c) {
  c = __formatString(b, c);
  b = Runtime.stackSave();
  a = _fwrite(allocate(c, "i8", ALLOC_STACK), 1, c.length, a);
  Runtime.stackRestore(b);
  return a
}
function _printf(a, b) {
  return _fprintf(HEAP32[_stdout >> 2], a, b)
}
function __exit(a) {
  __shutdownRuntime__();
  ABORT = true;
  throw"exit(" + a + ") called, at " + Error().stack;
}
function _exit(a) {
  __exit(a)
}
FS.init();
__ATEXIT__.push({func:function() {
  FS.quit()
}});
___setErrNo(0);
Module.callMain = function(a) {
  function b() {
    for(var a = 0;a < 3;a++) {
      d.push(0)
    }
  }
  var c = a.length + 1, d = [allocate(intArrayFromString("/bin/this.program"), "i8", ALLOC_STATIC)];
  b();
  for(var e = 0;e < c - 1;e += 1) {
    d.push(allocate(intArrayFromString(a[e]), "i8", ALLOC_STATIC)), b()
  }
  d.push(0);
  d = allocate(d, "i32", ALLOC_STATIC);
  return _main(c, d, 0)
};
var _qpDiv6, _qpMod6, _levelScale, _h264bsdQpC, _stuffingTable, _CeilLog2NumSliceGroups, _dcCoeffIndex, _codedBlockPatternIntra4x4, _codedBlockPatternInter, _runBefore_1, _runBefore_2, _runBefore_3, _runBefore_4, _runBefore_5, _runBefore_6, _totalZeros_1_0, _totalZeros_1_1, _totalZeros_2, _totalZeros_3, _totalZeros_4, _totalZeros_5, _totalZeros_6, _totalZeros_7, _totalZeros_8, _totalZeros_9, _totalZeros_10, _totalZeros_11, _totalZeros_12, _totalZeros_13, _totalZeros_14, _coeffToken0_0, _coeffToken0_1, 
_coeffToken0_2, _coeffToken0_3, _coeffToken2_0, _coeffToken2_1, _coeffToken2_2, _coeffToken4_0, _coeffToken4_1, _coeffToken8, _coeffTokenMinus1_0, _coeffTokenMinus1_1, _N_D_4x4B, _N_C_4x4B, _N_B_4x4B, _N_A_4x4B, _h264bsdBlockX, _h264bsdBlockY, _h264bsdClip, _N_D_SUB_PART, _N_C_SUB_PART, _N_B_SUB_PART, _N_A_SUB_PART, _lumaFracPos, _sample, _hashA, _hashB, _hashC, _hashD, _alphas, _betas, _tc0, _mb4x4Index, _tagName, _streamStop, _packetize, _nalUnitStream, _foutput, _screen, _maxNumPics, _tmpImage, 
_numErrors, _cropDisplay, _disableOutputReordering, _decInput, _decVer, __str, _i, __str1, __str2, __str3, __str4, __str5, __str6, __str7, _strmLen, _byteStrmStart, _decInst, _ret, _tmp, _picDisplayNumber, _picDecodeNumber, _decPicture, _imageData, _decInfo, _decOutput, _picSize, __str8, __str9, __str10, _NextPacket_prevIndex, __str11;
_qpDiv6 = allocate([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8], "i8", ALLOC_STATIC);
_qpMod6 = allocate([0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0, 1, 2, 3], "i8", ALLOC_STATIC);
_levelScale = allocate([10, 0, 0, 0, 13, 0, 0, 0, 16, 0, 0, 0, 11, 0, 0, 0, 14, 0, 0, 0, 18, 0, 0, 0, 13, 0, 0, 0, 16, 0, 0, 0, 20, 0, 0, 0, 14, 0, 0, 0, 18, 0, 0, 0, 23, 0, 0, 0, 16, 0, 0, 0, 20, 0, 0, 0, 25, 0, 0, 0, 18, 0, 0, 0, 23, 0, 0, 0, 29, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 
0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_h264bsdQpC = allocate([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0, 10, 0, 0, 0, 11, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 0, 14, 0, 0, 0, 15, 0, 0, 0, 16, 0, 0, 0, 17, 0, 0, 0, 18, 0, 0, 0, 19, 0, 0, 0, 20, 0, 0, 0, 21, 0, 0, 0, 22, 0, 0, 0, 23, 0, 0, 0, 24, 0, 0, 0, 25, 0, 0, 0, 26, 0, 0, 0, 27, 0, 0, 0, 28, 0, 0, 0, 29, 0, 0, 0, 29, 0, 0, 0, 30, 0, 0, 0, 31, 0, 0, 0, 32, 0, 0, 0, 32, 0, 0, 0, 33, 0, 0, 0, 34, 0, 0, 0, 34, 0, 
0, 0, 35, 0, 0, 0, 35, 0, 0, 0, 36, 0, 0, 0, 36, 0, 0, 0, 37, 0, 0, 0, 37, 0, 0, 0, 37, 0, 0, 0, 38, 0, 0, 0, 38, 0, 0, 0, 38, 0, 0, 0, 39, 0, 0, 0, 39, 0, 0, 0, 39, 0, 0, 0, 39, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 
0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 
0, "i32", 0, 0, 0], ALLOC_STATIC);
_stuffingTable = allocate([1, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 16, 0, 0, 0, 32, 0, 0, 0, 64, 0, 0, 0, 128, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_CeilLog2NumSliceGroups = allocate([1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0, 3, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_dcCoeffIndex = allocate([0, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 0, 10, 0, 0, 0, 11, 0, 0, 0, 14, 0, 0, 0, 15, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_codedBlockPatternIntra4x4 = allocate([47, 31, 15, 0, 23, 27, 29, 30, 7, 11, 13, 14, 39, 43, 45, 46, 16, 3, 5, 10, 12, 19, 21, 26, 28, 35, 37, 42, 44, 1, 2, 4, 8, 17, 18, 20, 24, 6, 9, 22, 25, 32, 33, 34, 36, 40, 38, 41], "i8", ALLOC_STATIC);
_codedBlockPatternInter = allocate([0, 16, 1, 2, 4, 8, 32, 3, 5, 10, 12, 15, 47, 7, 11, 13, 14, 6, 9, 31, 35, 37, 42, 44, 33, 34, 36, 40, 39, 43, 45, 46, 17, 18, 20, 24, 19, 21, 26, 28, 23, 27, 29, 30, 22, 25, 38, 41], "i8", ALLOC_STATIC);
_runBefore_1 = allocate([17, 1], "i8", ALLOC_STATIC);
_runBefore_2 = allocate([34, 18, 1, 1], "i8", ALLOC_STATIC);
_runBefore_3 = allocate([50, 34, 18, 2], "i8", ALLOC_STATIC);
_runBefore_4 = allocate([67, 51, 34, 34, 18, 18, 2, 2], "i8", ALLOC_STATIC);
_runBefore_5 = allocate([83, 67, 51, 35, 18, 18, 2, 2], "i8", ALLOC_STATIC);
_runBefore_6 = allocate([19, 35, 67, 51, 99, 83, 2, 2], "i8", ALLOC_STATIC);
_totalZeros_1_0 = allocate([0, 0, 101, 85, 68, 68, 52, 52, 35, 35, 35, 35, 19, 19, 19, 19, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], "i8", ALLOC_STATIC);
_totalZeros_1_1 = allocate([0, 249, 233, 217, 200, 200, 184, 184, 167, 167, 167, 167, 151, 151, 151, 151, 134, 134, 134, 134, 134, 134, 134, 134, 118, 118, 118, 118, 118, 118, 118, 118], "i8", ALLOC_STATIC);
_totalZeros_2 = allocate([230, 214, 198, 182, 165, 165, 149, 149, 132, 132, 132, 132, 116, 116, 116, 116, 100, 100, 100, 100, 84, 84, 84, 84, 67, 67, 67, 67, 67, 67, 67, 67, 51, 51, 51, 51, 51, 51, 51, 51, 35, 35, 35, 35, 35, 35, 35, 35, 19, 19, 19, 19, 19, 19, 19, 19, 3, 3, 3, 3, 3, 3, 3, 3], "i8", ALLOC_STATIC);
_totalZeros_3 = allocate([214, 182, 197, 197, 165, 165, 149, 149, 132, 132, 132, 132, 84, 84, 84, 84, 68, 68, 68, 68, 4, 4, 4, 4, 115, 115, 115, 115, 115, 115, 115, 115, 99, 99, 99, 99, 99, 99, 99, 99, 51, 51, 51, 51, 51, 51, 51, 51, 35, 35, 35, 35, 35, 35, 35, 35, 19, 19, 19, 19, 19, 19, 19, 19], "i8", ALLOC_STATIC);
_totalZeros_4 = allocate([197, 181, 165, 5, 148, 148, 116, 116, 52, 52, 36, 36, 131, 131, 131, 131, 99, 99, 99, 99, 83, 83, 83, 83, 67, 67, 67, 67, 19, 19, 19, 19], "i8", ALLOC_STATIC);
_totalZeros_5 = allocate([181, 149, 164, 164, 132, 132, 36, 36, 20, 20, 4, 4, 115, 115, 115, 115, 99, 99, 99, 99, 83, 83, 83, 83, 67, 67, 67, 67, 51, 51, 51, 51], "i8", ALLOC_STATIC);
_totalZeros_6 = allocate([166, 6, 21, 21, 132, 132, 132, 132, 147, 147, 147, 147, 147, 147, 147, 147, 115, 115, 115, 115, 115, 115, 115, 115, 99, 99, 99, 99, 99, 99, 99, 99, 83, 83, 83, 83, 83, 83, 83, 83, 67, 67, 67, 67, 67, 67, 67, 67, 51, 51, 51, 51, 51, 51, 51, 51, 35, 35, 35, 35, 35, 35, 35, 35], "i8", ALLOC_STATIC);
_totalZeros_7 = allocate([150, 6, 21, 21, 116, 116, 116, 116, 131, 131, 131, 131, 131, 131, 131, 131, 99, 99, 99, 99, 99, 99, 99, 99, 67, 67, 67, 67, 67, 67, 67, 67, 51, 51, 51, 51, 51, 51, 51, 51, 35, 35, 35, 35, 35, 35, 35, 35, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82], "i8", ALLOC_STATIC);
_totalZeros_8 = allocate([134, 6, 37, 37, 20, 20, 20, 20, 115, 115, 115, 115, 115, 115, 115, 115, 99, 99, 99, 99, 99, 99, 99, 99, 51, 51, 51, 51, 51, 51, 51, 51, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 82, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66], "i8", ALLOC_STATIC);
_totalZeros_9 = allocate([22, 6, 117, 117, 36, 36, 36, 36, 83, 83, 83, 83, 83, 83, 83, 83, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50], "i8", ALLOC_STATIC);
_totalZeros_10 = allocate([21, 5, 100, 100, 35, 35, 35, 35, 82, 82, 82, 82, 82, 82, 82, 82, 66, 66, 66, 66, 66, 66, 66, 66, 50, 50, 50, 50, 50, 50, 50, 50], "i8", ALLOC_STATIC);
_totalZeros_11 = allocate([4, 20, 35, 35, 51, 51, 83, 83, 65, 65, 65, 65, 65, 65, 65, 65], "i8", ALLOC_STATIC);
_totalZeros_12 = allocate([4, 20, 67, 67, 34, 34, 34, 34, 49, 49, 49, 49, 49, 49, 49, 49], "i8", ALLOC_STATIC);
_totalZeros_13 = allocate([3, 19, 50, 50, 33, 33, 33, 33], "i8", ALLOC_STATIC);
_totalZeros_14 = allocate([2, 18, 33, 33], "i8", ALLOC_STATIC);
_coeffToken0_0 = allocate([0, 0, 0, 0, 0, 0, 8294, 0, 4134, 0, 2054, 0, 6245, 0, 6245, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0, 2082, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken0_1 = allocate([0, 0, 0, 0, 0, 0, 0, 0, 16490, 0, 12362, 0, 10282, 0, 8202, 0, 14441, 0, 14441, 0, 10313, 0, 10313, 0, 8233, 0, 8233, 0, 6153, 0, 6153, 0, 12392, 0, 12392, 0, 12392, 0, 12392, 0, 8264, 0, 8264, 0, 8264, 0, 8264, 0, 6184, 0, 6184, 0, 6184, 0, 6184, 0, 4104, 0, 4104, 0, 4104, 0, 4104, 0, 10343, 0, 10343, 0, 10343, 0, 10343, 0, 10343, 0, 10343, 0, 10343, 0, 10343, 0, 6215, 0, 6215, 0, 6215, 0, 6215, 0, 6215, 0, 6215, 0, 6215, 0, 6215, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken0_2 = allocate([24686, 0, 22606, 0, 20526, 0, 20494, 0, 22638, 0, 20558, 0, 18478, 0, 18446, 0, 16397, 0, 16397, 0, 18509, 0, 18509, 0, 16429, 0, 16429, 0, 14349, 0, 14349, 0, 20589, 0, 20589, 0, 16461, 0, 16461, 0, 14381, 0, 14381, 0, 12301, 0, 12301, 0, 18539, 0, 18539, 0, 18539, 0, 18539, 0, 18539, 0, 18539, 0, 18539, 0, 18539, 0, 14411, 0, 14411, 0, 14411, 0, 14411, 0, 14411, 0, 14411, 0, 14411, 0, 14411, 0, 12331, 0, 12331, 0, 12331, 0, 12331, 0, 12331, 0, 12331, 0, 12331, 0, 12331, 
0, 10251, 0, 10251, 0, 10251, 0, 10251, 0, 10251, 0, 10251, 0, 10251, 0, 10251, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken0_3 = allocate([0, 0, 0, 0, 26671, 0, 26671, 0, -32752, 0, -32688, 0, -32720, 0, 30736, 0, -32656, 0, 30800, 0, 30768, 0, 28688, 0, 30832, 0, 28752, 0, 28720, 0, 26640, 0, 28783, 0, 28783, 0, 26703, 0, 26703, 0, 24623, 0, 24623, 0, 24591, 0, 24591, 0, 26735, 0, 26735, 0, 24655, 0, 24655, 0, 22575, 0, 22575, 0, 22543, 0, 22543, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken2_0 = allocate([0, 0, 0, 0, 0, 0, 0, 0, 14438, 0, 8262, 0, 8230, 0, 4102, 0, 12390, 0, 6214, 0, 6182, 0, 2054, 0, 10341, 0, 10341, 0, 4133, 0, 4133, 0, 8292, 0, 8292, 0, 8292, 0, 8292, 0, 6244, 0, 6244, 0, 6244, 0, 6244, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0, 4163, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken2_1 = allocate([0, 0, 0, 0, 0, 0, 0, 0, 18537, 0, 14409, 0, 14377, 0, 12297, 0, 10248, 0, 10248, 0, 12360, 0, 12360, 0, 12328, 0, 12328, 0, 8200, 0, 8200, 0, 16487, 0, 16487, 0, 16487, 0, 16487, 0, 10311, 0, 10311, 0, 10311, 0, 10311, 0, 10279, 0, 10279, 0, 10279, 0, 10279, 0, 6151, 0, 6151, 0, 6151, 0, 6151, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken2_2 = allocate([0, 0, 0, 0, 30829, 0, 30829, 0, -32658, 0, -32690, 0, -32722, 0, -32754, 0, 30766, 0, 30734, 0, 30798, 0, 28718, 0, 28749, 0, 28749, 0, 28685, 0, 28685, 0, 28781, 0, 28781, 0, 26701, 0, 26701, 0, 26669, 0, 26669, 0, 26637, 0, 26637, 0, 26733, 0, 26733, 0, 24653, 0, 24653, 0, 24621, 0, 24621, 0, 24589, 0, 24589, 0, 22540, 0, 22540, 0, 22540, 0, 22540, 0, 22604, 0, 22604, 0, 22604, 0, 22604, 0, 22572, 0, 22572, 0, 22572, 0, 22572, 0, 20492, 0, 20492, 0, 20492, 0, 20492, 0, 
24684, 0, 24684, 0, 24684, 0, 24684, 0, 20556, 0, 20556, 0, 20556, 0, 20556, 0, 20524, 0, 20524, 0, 20524, 0, 20524, 0, 18444, 0, 18444, 0, 18444, 0, 18444, 0, 22635, 0, 22635, 0, 22635, 0, 22635, 0, 22635, 0, 22635, 0, 22635, 0, 22635, 0, 18507, 0, 18507, 0, 18507, 0, 18507, 0, 18507, 0, 18507, 0, 18507, 0, 18507, 0, 18475, 0, 18475, 0, 18475, 0, 18475, 0, 18475, 0, 18475, 0, 18475, 0, 18475, 0, 16395, 0, 16395, 0, 16395, 0, 16395, 0, 16395, 0, 16395, 0, 16395, 0, 16395, 0, 20587, 0, 20587, 0, 20587, 
0, 20587, 0, 20587, 0, 20587, 0, 20587, 0, 20587, 0, 16459, 0, 16459, 0, 16459, 0, 16459, 0, 16459, 0, 16459, 0, 16459, 0, 16459, 0, 16427, 0, 16427, 0, 16427, 0, 16427, 0, 16427, 0, 16427, 0, 16427, 0, 16427, 0, 14347, 0, 14347, 0, 14347, 0, 14347, 0, 14347, 0, 14347, 0, 14347, 0, 14347, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, 
"i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken4_0 = allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6150, 0, 14406, 0, 14374, 0, 4102, 0, 18534, 0, 12358, 0, 12326, 0, 2054, 0, 10277, 0, 10277, 0, 10309, 0, 10309, 0, 8229, 0, 8229, 0, 8261, 0, 8261, 0, 6181, 0, 6181, 0, 16485, 0, 16485, 0, 6213, 0, 6213, 0, 4133, 0, 4133, 0, 14436, 0, 14436, 0, 14436, 0, 14436, 0, 12388, 0, 12388, 0, 12388, 0, 12388, 0, 10340, 0, 10340, 0, 10340, 0, 10340, 0, 8292, 0, 8292, 0, 8292, 0, 8292, 0, 6244, 0, 6244, 0, 6244, 0, 6244, 0, 4164, 0, 
4164, 0, 4164, 0, 4164, 0, 2084, 0, 2084, 0, 2084, 0, 2084, 0, 4, 0, 4, 0, 4, 0, 4, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken4_1 = allocate([0, 0, -32758, 0, -32662, 0, -32694, 0, -32726, 0, 30730, 0, 30826, 0, 30794, 0, 30762, 0, 28682, 0, 28778, 0, 28746, 0, 28714, 0, 26634, 0, 26665, 0, 26665, 0, 24585, 0, 24585, 0, 26697, 0, 26697, 0, 24617, 0, 24617, 0, 22537, 0, 22537, 0, 26729, 0, 26729, 0, 24649, 0, 24649, 0, 22569, 0, 22569, 0, 20489, 0, 20489, 0, 24680, 0, 24680, 0, 24680, 0, 24680, 0, 22600, 0, 22600, 0, 22600, 0, 22600, 0, 20520, 0, 20520, 0, 20520, 0, 20520, 0, 18440, 0, 18440, 0, 18440, 0, 18440, 
0, 22632, 0, 22632, 0, 22632, 0, 22632, 0, 20552, 0, 20552, 0, 20552, 0, 20552, 0, 18472, 0, 18472, 0, 18472, 0, 18472, 0, 16392, 0, 16392, 0, 16392, 0, 16392, 0, 14343, 0, 14343, 0, 14343, 0, 14343, 0, 14343, 0, 14343, 0, 14343, 0, 14343, 0, 12295, 0, 12295, 0, 12295, 0, 12295, 0, 12295, 0, 12295, 0, 12295, 0, 12295, 0, 18503, 0, 18503, 0, 18503, 0, 18503, 0, 18503, 0, 18503, 0, 18503, 0, 18503, 0, 10247, 0, 10247, 0, 10247, 0, 10247, 0, 10247, 0, 10247, 0, 10247, 0, 10247, 0, 20583, 0, 20583, 0, 
20583, 0, 20583, 0, 20583, 0, 20583, 0, 20583, 0, 20583, 0, 16455, 0, 16455, 0, 16455, 0, 16455, 0, 16455, 0, 16455, 0, 16455, 0, 16455, 0, 16423, 0, 16423, 0, 16423, 0, 16423, 0, 16423, 0, 16423, 0, 16423, 0, 16423, 0, 8199, 0, 8199, 0, 8199, 0, 8199, 0, 8199, 0, 8199, 0, 8199, 0, 8199, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, 
"i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffToken8 = allocate([2054, 0, 2086, 0, 0, 0, 6, 0, 4102, 0, 4134, 0, 4166, 0, 0, 0, 6150, 0, 6182, 0, 6214, 0, 6246, 0, 8198, 0, 8230, 0, 8262, 0, 8294, 0, 10246, 0, 10278, 0, 10310, 0, 10342, 0, 12294, 0, 12326, 0, 12358, 0, 12390, 0, 14342, 0, 14374, 0, 14406, 0, 14438, 0, 16390, 0, 16422, 0, 16454, 0, 16486, 0, 18438, 0, 18470, 0, 18502, 0, 18534, 0, 20486, 0, 20518, 0, 20550, 0, 20582, 0, 22534, 0, 22566, 0, 22598, 0, 22630, 0, 24582, 0, 24614, 0, 24646, 0, 24678, 0, 26630, 0, 26662, 0, 26694, 
0, 26726, 0, 28678, 0, 28710, 0, 28742, 0, 28774, 0, 30726, 0, 30758, 0, 30790, 0, 30822, 0, -32762, 0, -32730, 0, -32698, 0, -32666, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 
0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffTokenMinus1_0 = allocate([0, 0, 4163, 0, 2, 0, 2, 0, 2081, 0, 2081, 0, 2081, 0, 2081, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_coeffTokenMinus1_1 = allocate([8295, 0, 8295, 0, 8264, 0, 8232, 0, 6215, 0, 6215, 0, 6183, 0, 6183, 0, 8198, 0, 8198, 0, 8198, 0, 8198, 0, 6150, 0, 6150, 0, 6150, 0, 6150, 0, 4102, 0, 4102, 0, 4102, 0, 4102, 0, 6246, 0, 6246, 0, 6246, 0, 6246, 0, 4134, 0, 4134, 0, 4134, 0, 4134, 0, 2054, 0, 2054, 0, 2054, 0, 2054, 0], ["i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, 
"i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0, "i16", 0], ALLOC_STATIC);
_N_D_4x4B = allocate([3, 0, 0, 0, 15, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 3, 0, 0, 0, 19, undef, 0, 
0, 1, 0, 0, 0, 18, undef, 0, 0, 0, 0, 0, 0, 17, undef, 0, 0, 4, 0, 0, 0, 16, undef, 0, 0, 3, 0, 0, 0, 23, undef, 0, 0, 1, 0, 0, 0, 22, undef, 0, 0, 0, 0, 0, 0, 21, undef, 0, 0, 4, 0, 0, 0, 20, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 
0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", 
"i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_C_4x4B = allocate([1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 255, 0, 0, 0, 4, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 2, 0, 0, 0, 10, undef, 0, 0, 4, 0, 0, 0, 5, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 255, 0, 0, 0, 12, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 13, undef, 0, 0, 255, 0, 0, 0, 8, undef, 0, 0, 1, 0, 0, 0, 19, 
undef, 0, 0, 2, 0, 0, 0, 18, undef, 0, 0, 4, 0, 0, 0, 17, undef, 0, 0, 255, 0, 0, 0, 16, undef, 0, 0, 1, 0, 0, 0, 23, undef, 0, 0, 2, 0, 0, 0, 22, undef, 0, 0, 4, 0, 0, 0, 21, undef, 0, 0, 255, 0, 0, 0, 20, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", 
"i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", 
"i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_B_4x4B = allocate([1, 0, 0, 0, 10, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 4, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 4, 0, 0, 0, 13, undef, 0, 0, 1, 0, 0, 0, 18, undef, 0, 
0, 1, 0, 0, 0, 19, undef, 0, 0, 4, 0, 0, 0, 16, undef, 0, 0, 4, 0, 0, 0, 17, undef, 0, 0, 1, 0, 0, 0, 22, undef, 0, 0, 1, 0, 0, 0, 23, undef, 0, 0, 4, 0, 0, 0, 20, undef, 0, 0, 4, 0, 0, 0, 21, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 
0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", 
"i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_A_4x4B = allocate([0, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 0, 0, 0, 0, 15, undef, 0, 0, 4, 0, 0, 0, 10, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 4, 0, 0, 0, 11, undef, 0, 0, 4, 0, 0, 0, 14, undef, 0, 0, 0, 0, 0, 0, 17, undef, 0, 
0, 4, 0, 0, 0, 16, undef, 0, 0, 0, 0, 0, 0, 19, undef, 0, 0, 4, 0, 0, 0, 18, undef, 0, 0, 0, 0, 0, 0, 21, undef, 0, 0, 4, 0, 0, 0, 20, undef, 0, 0, 0, 0, 0, 0, 23, undef, 0, 0, 4, 0, 0, 0, 22, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 
0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", 
"i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_h264bsdBlockX = allocate([0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_h264bsdBlockY = allocate([0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_h264bsdClip = allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 
111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 
212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 
255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], "i8", ALLOC_STATIC);
_N_D_SUB_PART = allocate([3, 0, 0, 0, 15, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 3, 0, 0, 0, 15, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 3, 0, 0, 0, 15, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 3, 0, 0, 0, 15, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 
0, 11, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 
0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 
0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", 
"i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", 
"i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 
0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", 
"i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 
0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_C_SUB_PART = allocate([1, 0, 0, 0, 14, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 255, 0, 0, 0, 4, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 255, 0, 0, 0, 4, undef, 0, 0, 2, 
0, 0, 0, 10, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 2, 0, 0, 0, 10, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 2, 0, 0, 0, 10, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 2, 0, 0, 0, 10, undef, 0, 0, 4, 0, 0, 0, 5, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 255, 
0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 255, 0, 0, 0, 12, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 255, 0, 0, 0, 12, undef, 0, 0, 255, 0, 0, 0, 2, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 
0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 2, undef, 0, 0, 255, 0, 0, 0, 8, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 2, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 13, undef, 0, 0, 255, 0, 0, 0, 8, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 
0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", 
"i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, 
"i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", 
"i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", 
"i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_B_SUB_PART = allocate([1, 0, 0, 0, 10, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 10, undef, 0, 0, 1, 0, 0, 0, 11, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 1, 0, 0, 
0, 14, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 1, 0, 0, 0, 14, undef, 0, 0, 1, 0, 0, 0, 15, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 4, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 255, 0, 0, 0, 
0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 
0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 4, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 4, 0, 0, 0, 13, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", 
"i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", 
"i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 
0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", 
"i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 
0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_N_A_SUB_PART = allocate([0, 0, 0, 0, 5, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 5, undef, 0, 0, 4, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 7, undef, 0, 0, 4, 0, 0, 0, 2, undef, 0, 0, 4, 0, 0, 0, 1, 
undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 1, undef, 0, 0, 4, 0, 0, 0, 4, undef, 0, 0, 4, 0, 0, 0, 3, undef, 0, 0, 4, 0, 0, 0, 6, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 
0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 0, 0, 0, 0, 15, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 0, 0, 0, 0, 13, undef, 0, 0, 4, 0, 0, 0, 8, undef, 0, 0, 0, 0, 0, 0, 15, undef, 0, 0, 4, 0, 0, 0, 10, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 
255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 11, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 255, 0, 0, 0, 0, undef, 0, 0, 4, 0, 0, 0, 9, undef, 0, 0, 4, 0, 0, 0, 12, undef, 0, 0, 4, 0, 0, 0, 11, undef, 0, 0, 4, 0, 0, 0, 14, undef, 0, 0], ["i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", 
"i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", 
"i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 
0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", 
"i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 
0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8", "i32", 0, 0, 0, "i8", "i8", "i8", "i8"], ALLOC_STATIC);
_lumaFracPos = allocate([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0, 10, 0, 0, 0, 11, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 0, 14, 0, 0, 0, 15, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_sample = allocate(1, "i32", ALLOC_STATIC);
_hashA = allocate(1, "i32", ALLOC_STATIC);
_hashB = allocate(1, "i32", ALLOC_STATIC);
_hashC = allocate(1, "i32", ALLOC_STATIC);
_hashD = allocate(1, "i32", ALLOC_STATIC);
_alphas = allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 5, 6, 7, 8, 9, 10, 12, 13, 15, 17, 20, 22, 25, 28, 32, 36, 40, 45, 50, 56, 63, 71, 80, 90, 101, 113, 127, 144, 162, 182, 203, 226, 255, 255], "i8", ALLOC_STATIC);
_betas = allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18], "i8", ALLOC_STATIC);
_tc0 = allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 3, 1, 2, 3, 2, 2, 3, 2, 2, 4, 2, 3, 4, 2, 3, 4, 3, 3, 5, 3, 4, 6, 3, 4, 6, 4, 5, 7, 4, 5, 8, 4, 6, 9, 5, 7, 10, 6, 8, 11, 6, 8, 13, 7, 10, 14, 8, 11, 16, 9, 12, 18, 10, 13, 20, 11, 15, 23, 13, 17, 25], 
"i8", ALLOC_STATIC);
_mb4x4Index = allocate([0, 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, 0, 5, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 0, 6, 0, 0, 0, 7, 0, 0, 0, 8, 0, 0, 0, 9, 0, 0, 0, 12, 0, 0, 0, 13, 0, 0, 0, 10, 0, 0, 0, 11, 0, 0, 0, 14, 0, 0, 0, 15, 0, 0, 0], ["i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_tagName = allocate([36, 78, 97, 109, 101, 58, 32, 70, 73, 82, 83, 84, 95, 65, 78, 68, 82, 79, 73, 68, 95, 67, 79, 80, 89, 82, 73, 71, 72, 84, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "i8", ALLOC_STATIC);
_streamStop = allocate(1, "i8*", ALLOC_STATIC);
_packetize = allocate(1, "i32", ALLOC_STATIC);
_nalUnitStream = allocate(1, "i32", ALLOC_STATIC);
_foutput = allocate(1, "%struct.__sFILE*", ALLOC_STATIC);
_screen = allocate(1, "%struct.SDL_Surface*", ALLOC_STATIC);
_maxNumPics = allocate(1, "i32", ALLOC_STATIC);
_tmpImage = allocate(1, "i8*", ALLOC_STATIC);
_numErrors = allocate(1, "i32", ALLOC_STATIC);
_cropDisplay = allocate(1, "i32", ALLOC_STATIC);
_disableOutputReordering = allocate(1, "i32", ALLOC_STATIC);
_decInput = allocate(16, ["i8*", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_decVer = allocate(8, "i32", ALLOC_STATIC);
__str = allocate([45, 84, 0], "i8", ALLOC_STATIC);
_i = allocate(1, "i32", ALLOC_STATIC);
__str1 = allocate([45, 78, 0], "i8", ALLOC_STATIC);
__str2 = allocate([45, 79, 0], "i8", ALLOC_STATIC);
__str3 = allocate([45, 80, 0], "i8", ALLOC_STATIC);
__str4 = allocate([45, 85, 0], "i8", ALLOC_STATIC);
__str5 = allocate([45, 67, 0], "i8", ALLOC_STATIC);
__str6 = allocate([45, 82, 0], "i8", ALLOC_STATIC);
__str7 = allocate([114, 98, 0], "i8", ALLOC_STATIC);
_strmLen = allocate(1, "i32", ALLOC_STATIC);
_byteStrmStart = allocate(1, "i8*", ALLOC_STATIC);
_decInst = allocate(1, "i8*", ALLOC_STATIC);
_ret = allocate(1, "i32", ALLOC_STATIC);
_tmp = allocate(1, "i32", ALLOC_STATIC);
_picDisplayNumber = allocate(1, "i32", ALLOC_STATIC);
_picDecodeNumber = allocate(1, "i32", ALLOC_STATIC);
_decPicture = allocate(16, ["i32*", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0, "i32", 0, 0, 0], ALLOC_STATIC);
_imageData = allocate(1, "i8*", ALLOC_STATIC);
_decInfo = allocate(48, "i32", ALLOC_STATIC);
_decOutput = allocate(4, "i8*", ALLOC_STATIC);
_picSize = allocate(1, "i32", ALLOC_STATIC);
__str8 = allocate([79, 110, 70, 114, 97, 109, 101, 68, 101, 99, 111, 100, 101, 100, 10, 0], "i8", ALLOC_STATIC);
__str9 = allocate([83, 101, 116, 80, 111, 115, 105, 116, 105, 111, 110, 32, 37, 102, 10, 0], "i8", ALLOC_STATIC);
__str10 = allocate([71, 101, 116, 80, 111, 115, 105, 116, 105, 111, 110, 10, 0], "i8", ALLOC_STATIC);
_NextPacket_prevIndex = allocate(1, "i32", ALLOC_STATIC);
__str11 = allocate([37, 115, 10, 0], "i8", ALLOC_STATIC);
FUNCTION_TABLE = [0, 0, _FillRow1, 0, _h264bsdFillRow7, 0];
Module.FUNCTION_TABLE = FUNCTION_TABLE;
function run(a) {
  a = a || Module.arguments;
  __globalConstructor__();
  var b = null;
  Module._main && (b = Module.callMain(a), __shutdownRuntime__());
  return b
}
Module.run = run;
try {
  FS.ignorePermissions = false
}catch(e$$10) {
}
Module.noInitialRun = true;
if(!Module.noInitialRun) {
  var ret = run()
}
Module.FS = FS;
Module.HEAPU8 = HEAPU8;
Module.CorrectionsMonitor = CorrectionsMonitor;
FS.createDataFile = FS.createDataFile;
var breakLoop = false, _runMainLoop = function() {
  window.addEventListener("message", function() {
    _mainLoopIteration();
    breakLoop || window.postMessage(0, "*")
  }, false)
};
Module.play = function() {
  breakLoop = false;
  window.postMessage(0, "*")
};
Module.stop = function() {
  breakLoop = true
};
Module.onFrameDecoded = function() {
};
_broadwayOnFrameDecoded = function() {
  Module.onFrameDecoded()
};
Module.setPosition = _broadwaySetPosition;
Module.getPosition = _broadwayGetPosition;
var patches = Module.patches = {};
function getGlobalScope() {
  return function() {
    return this
  }.call(null)
}
assert = function(a, b) {
  if(!a) {
    throw"Assertion: " + b;
  }
};
Module.patch = function(a, b, c) {
  assert(typeof c == "function");
  a || (a = getGlobalScope());
  Module.CC_VARIABLE_MAP && (b = Module.CC_VARIABLE_MAP[b]);
  assert(b in a && typeof a[b] == "function", "Can only patch functions.");
  patches[b] = a[b];
  a[b] = c;
  return patches[b]
};
Module.unpatch = function(a, b) {
  a || (a = getGlobalScope());
  Module.CC_VARIABLE_MAP && (b = Module.CC_VARIABLE_MAP[b]);
  assert(b in a && typeof a[b] == "function");
  b in patches && (a[b] = patches[b])
};
function getSurface() {
  var a = SDL.surfaces[SDL.screen];
  if(!a.image) {
    a.image = a.ctx.getImageData(0, 0, a.width, a.height);
    for(var b = a.image.data, c = b.length, d = 0;d < c / 4;d++) {
      b[d * 4 + 3] = 255
    }
  }
  return a
}
Module.paint = function(a, b, c, d, e) {
  for(var f, g, h, j, l, k, m = d >> 1, n = d * 4, q = getSurface(), p = q.image.data, o = 0;e -= 2;) {
    for(k = m;k--;) {
      h = HEAPU8[c++], f = HEAPU8[b++], j = 409 * h - 56992, h = 34784 - 208 * h - 100 * f, l = 516 * f - 70688, g = HEAPU8[a + d] * 298, f = HEAPU8[a++] * 298, p[o + n] = g + j >> 8, p[o++] = f + j >> 8, p[o + n] = g + h >> 8, p[o++] = f + h >> 8, p[o + n] = g + l >> 8, p[o++] = f + l >> 8, o++, g = HEAPU8[a + d] * 298, f = HEAPU8[a++] * 298, p[o + n] = g + j >> 8, p[o++] = f + j >> 8, p[o + n] = g + h >> 8, p[o++] = f + h >> 8, p[o + n] = g + l >> 8, p[o++] = f + l >> 8, o++
    }
    o += n;
    a += d
  }
  q.ctx.putImageData(q.image, 0, 0)
};
_paint = function(a, b, c, d, e) {
  Module.paint(a, b, c, d, e)
};

