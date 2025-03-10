//By + Copyright Greg Abbott 2023-2025. 
//V1 2023_0204 V 2025_0310
var gl0={}//global
function make_string_ish(x){
  return x===globalThis?'globalThis'// if(x===window)same result
 :typeof x ==='function'?String(x)// for viewing in output area
 :x===undefined?`undefined`
 :typeof x !== 'string'?JSON.stringify(x,'null','  ')
 :`"${x}"`
}
function parse_and_run(o,live_mode_is_on){
  o.outputs=[]//output items in order
  const handler=l=>(...a)=>{
    o.outputs.push({kind:l,v:a.map(make_string_ish).join('\n')})
  }
  const shadow_console={
    log:handler('log')
    /*(...a)=>{
      console.log(...a)//given data to real console
      handler('log')(...a)//stringify data for output area
    }*/
    ,
    table:handler('table')
    /*(...x)=>{
      console.table(...x)
      handler('table')(...x)
    }*/
  }
  const shadow_prompt=(the_prompt)=>{
    o.outputs.push({
      kind:'prompt',
      v:`In Live mode, prompt("${the_prompt}"), returns "true"`
    })
    return 'true'
  }
  const shadow_confirm=(the_question)=>{
    o.outputs.push({
      kind:'confirm',
      v:`In Live mode, confirm("${the_question}"), returns true`
    })
    return true
  }
  const shadow_alert=live_mode_is_on
    ?handler('alert')
    :x=>alert(make_string_ish(x))
  try { 
     o.rv = Function('alert','console','prompt','confirm',o.fn)(
      shadow_alert,
      shadow_console,
      live_mode_is_on?shadow_prompt:prompt,
      live_mode_is_on?shadow_confirm:confirm
    )
    o.outputs.push({kind:'rv',v:make_string_ish(o.rv)})
  }
  catch (e){ 
    console.error(e)
    o.error=e 
  }
  return o
}
(()=>{
const chain=(x,...l)=>l.reduce((a,c)=>c(a),x)
const log=x=>(console.log(x), x)
const el={}
const get_by_id=id=>document.getElementById(id)
const ids=[
`input`,`copy_input`,`save_input`,
`output`,`copy_output`,`save_output`,
`clear_all`,`load_demo`,
`live`,
`run`,
`left`,`right`,`column_sizer`,`undo`,`redo`
]
ids.forEach(id=>el[id]=get_by_id(id))
const input_fns = setup_text_editor(el.input,el.undo,el.redo)//external script
//input_fns also returns set_value() undo_stack[] redo_stack[]

el.undo.onclick=()=>{
  input_fns.undo()
}
el.redo.onclick=()=>{
  input_fns.redo()
}
let db={input:``,live:``}//LET as lazy Local storage override
function select_text(element) {/*ignore pseudo :before element*/
  let range = document.createRange()
  range.selectNodeContents(element)
  let selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}
const go=()=>{
  //console.clear()//clear messages from previous run
  const o= parse_and_run({fn:el.input.value},el.live.checked)
  //console.log(o)
  const {outputs,error}=o
  if(error){
    el.output.innerHTML = error
    el.input.focus()
    return
  }
  const fragment = document.createDocumentFragment()
  outputs.forEach(({kind,v})=>{
    const div = document.createElement('div')
    div.textContent = v+'\n\n'
    div.classList.add(`ok_${kind}`)//o.k == output kind
    div.onclick=()=>select_text(div)
    fragment.appendChild(div)
  })
  el.output.innerHTML = ''//Clear previous output
  el.output.appendChild(fragment)
  el.input.focus()
}
const copy=({clicked,str})=>{
  navigator.clipboard.writeText(str)
  if(clicked){//update text of clicked element
    const init=clicked.innerText
    clicked.innerText='Copied'
    setTimeout(()=>{clicked.innerText=init},2000)
  }
}
const demo_input = 
`// A simple JavaScript code runner, playground and scratchpad.
// Project <28KB. Written in vanilla JS.
alert(
  [
    {
      mode: 'Live',
      alert_outputs_to: 'Output area',
    },
    { 
      mode: 'Normal',
      alert_outputs_to: 'Alert dialog',
    }
  ]
)
// Disable Live mode to use confirm() and prompt() normally.
// (In Live mode, these return true and "true" automatically)
// 
// Optional output methods
console.log(
  {a:1,b:2},
  x=>x+1,
  undefined,
  null,
  {user_confirmed:confirm('Demo confirmation')},
  1,
  'Hello'
)
return 'Return Value'`
el.column_sizer.addEventListener('dblclick', () => {
  el.left.style.width = '50%'
  el.right.style.width = '50%'
})
el.column_sizer.addEventListener('pointerdown',e=>{
  document.addEventListener('pointermove', resize_columns)
  function mouse_up_fn(){
    document.removeEventListener('pointermove',resize_columns)
    el.input.focus()
  }
  document.addEventListener('pointerup', mouse_up_fn,{once:true})
})
function resize_columns(event) {
  const container_rect = el.column_sizer.parentElement
    .getBoundingClientRect()
  const left_width = event.clientX - container_rect.left
  el.left.style.width = `${left_width}px`
  el.right.style.width = `${
    container_rect.width-left_width-el.column_sizer.offsetWidth
  }px`
}
function on(tag,fn){return l=>(l.addEventListener(tag,fn),l)}
on('click',e=>{
  copy({clicked:e.target,str:el.input.value})
  el.input.focus()
})(el.copy_input)
on('click',e=>{
  copy({clicked:e.target,str:el.output.textContent})
  el.input.focus()
})(el.copy_output)
on('click',e=>{
  input_fns.set_value('')//stores history state
  el.input.focus()
})(el.clear_all)
on('click',e=>{
  input_fns.set_value(demo_input)//stores history state
  el.input.focus()
})(el.load_demo)
const live_or_not=()=>{
	if(el.live.checked){
		el.input.addEventListener('keyup',go)
    el.run.classList.add('hide')
		go()
	}
	else{
    el.input.removeEventListener('keyup',go)
    el.output.innerHTML = ''
    el.run.classList.remove('hide')
    el.input.focus()
  }
}
on('click',go)(el.run)
el.live.onchange=live_or_not
const local_storage_name = `js_code_runner_2023_0204`
const store=()=>{
  //update current stored values in db
	db.input=el.input.value
	db.live=el.live.checked
  localStorage.setItem(
    local_storage_name,
    JSON.stringify(db)
  )
}
const restore=()=>{
	if (localStorage.getItem(local_storage_name)){
		log(`Restoring from localStorage`)
		db = JSON.parse(localStorage.getItem(local_storage_name))
		el.input.value=db.input
		el.live.checked=db.live
	}
  else{
    el.input.value=demo_input
  }
}
window.onload=()=>{
	//initial state: el.live.checked = true 
	restore()
	live_or_not()//live_or_not calls go() if live mode is on
}
window.addEventListener("beforeunload", e => {
	/*if user has interacted with the page,
    this fires on close tab, close window, or leave (url).
	It can't execute blocking events (alert, prompt, confirm) */
	store()
})
function clear_local_storage (){
  localStorage.removeItem(local_storage_name)
}
function get_stamp(d = new Date()) {
  const p=n=>String(n).padStart(2,'0')
  return `${d.getFullYear()}_${
    p(d.getMonth() + 1)}${p(d.getDate())}_${
    p(d.getHours())}${p(d.getMinutes())}`
}
on('click',()=>{
  download_file({
    data:el.input.value,
    name:`input ${get_stamp()}`,
    ext: 'js'
  })
  el.input.focus()
})(el.save_input)
on('click',()=>{
  download_file({
    data:el.output.textContent,
    name:`output ${get_stamp()}`,
    ext: 'md'
  })
  el.input.focus()
})(el.save_output)
function download_file({ name, data,ext }) {
  const blob = new Blob(
    [data], 
    { 
      type: 
        ext=='json'?'application/json'
        :ext=='js'?`application/javascript`
        :'text/plain'
    }
  )
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name}.${ext}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
const cmd_enter = ({element, on,after}) => {
  const handle_key_up=()=>{
    if(after)after()//BUG: doesn't trigger until next keypress
    //re-enable
    element.addEventListener('keydown', handle_key_down)
  }
  const handle_key_down = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.code === 'Enter') {
      element.addEventListener(
        'keyup',handle_key_up,
        { once: true }//removes listener after keyup
      )
      // Prevent multi-trigger if user holds keys down
      element.removeEventListener('keydown', handle_key_down)
      on()//action to do on CMD+Enter
    }
  }
  element.addEventListener('keydown', handle_key_down)
}
cmd_enter({
  element: el.input,//Only when input area focused
  on: ()=>{
    el.run.classList.add('active')
    setTimeout(()=>el.run.classList.remove('active'),500)
    setTimeout(()=>el.run.click(),1)//prevent this firing first
  }
})
})()