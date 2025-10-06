// app.js – مدیریت پیام ناشناس شبیه حرفتو
// پیام‌ها در localStorage ذخیره می‌شوند

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return document.querySelectorAll(sel); }

let usernameKey = 'harfeto_username';
let tokenKey = 'harfeto_token';
let messagesKey = 'harfeto_messages';

function generateToken(len=16){
    let arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => ('00'+b.toString(16)).slice(-2)).join('');
}

document.addEventListener('DOMContentLoaded', () => {

    // ---------- index.html ----------
    if($('form')){
        let form = $('form');
        form.addEventListener('submit', e => {
            e.preventDefault();
            let username = form.querySelector('input[name="username"]').value.trim();
            if(!username){ alert('نام کاربری نمی‌تواند خالی باشد'); return; }
            let note = form.querySelector('input[name="note"]').value.trim();
            let token = generateToken(16);

            localStorage.setItem(usernameKey, username);
            localStorage.setItem(tokenKey, token);
            localStorage.setItem(messagesKey, JSON.stringify({}));

            let container = document.createElement('div');
            container.innerHTML = `
                <h3>لینک ساخته شد 🎉</h3>
                <p>لینک عمومی: <span style="word-break:break-all;">send.html?user=${username}</span></p>
                <p>لینک صندوق پیام (مخفی): <span style="word-break:break-all;">inbox.html?user=${username}&token=${token}</span></p>
            `;
            form.parentNode.appendChild(container);
            form.style.display = 'none';
        });
    }

    // ---------- send.html ----------
    if($('form[name="sendForm"]') || $('form')){
        let urlParams = new URLSearchParams(window.location.search);
        let user = urlParams.get('user') || 'ali';
        let form = $('form');
        form.addEventListener('submit', e => {
            e.preventDefault();
            let sender = form.querySelector('input[name="sender_name"]').value.trim();
            let body = form.querySelector('textarea[name="body"]').value.trim();
            if(!body){ alert('متن پیام نمی‌تواند خالی باشد'); return; }

            let allMsgs = JSON.parse(localStorage.getItem(messagesKey) || '{}');
            if(!allMsgs[user]) allMsgs[user] = [];
            let now = new Date();
            allMsgs[user].unshift({sender: sender||'-', body: body, created: now.toLocaleString()});
            localStorage.setItem(messagesKey, JSON.stringify(allMsgs));

            alert('پیام ارسال شد ✅');
            form.reset();
        });
    }

    // ---------- inbox.html ----------
    if($('table tbody')){
        let urlParams = new URLSearchParams(window.location.search);
        let user = urlParams.get('user');
        let token = urlParams.get('token');

        if(!user || !token){ alert('لینک مخفی معتبر نیست'); return; }

        let tbody = $('table tbody');
        let allMsgs = JSON.parse(localStorage.getItem(messagesKey) || '{}');
        let msgs = allMsgs[user] || [];

        function renderTable(){
            tbody.innerHTML = '';
            msgs.forEach((m,i)=>{
                let tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${m.created}</td>
                    <td>${m.sender}</td>
                    <td>${m.body}</td>
                    <td><button data-id="${i}">حذف</button></td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderTable();

        tbody.addEventListener('click', e=>{
            if(e.target.tagName==='BUTTON'){
                let id = parseInt(e.target.dataset.id);
                msgs.splice(id,1);
                allMsgs[user]=msgs;
                localStorage.setItem(messagesKey, JSON.stringify(allMsgs));
                renderTable();
            }
        });

        let clearBtn = document.createElement('button');
        clearBtn.textContent = 'حذف همه پیام‌ها';
        clearBtn.style.marginTop='12px';
        clearBtn.style.padding='8px 10px';
        clearBtn.style.borderRadius='8px';
        clearBtn.style.border='0';
        clearBtn.style.background='#FF6B6B';
        clearBtn.style.color='#fff';
        clearBtn.style.cursor='pointer';
        tbody.parentNode.appendChild(clearBtn);
        clearBtn.addEventListener('click', ()=>{
            if(confirm('آیا مطمئن هستید؟')){
                msgs=[];
                allMsgs[user]=msgs;
                localStorage.setItem(messagesKey, JSON.stringify(allMsgs));
                renderTable();
            }
        });
    }
});
