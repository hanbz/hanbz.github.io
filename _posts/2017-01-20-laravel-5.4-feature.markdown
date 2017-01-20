Laravel 5.3才剛更新到產品上沒多久就出5.4了Orz...要逼死誰啊XD
但是許多的新特性的確不錯，來紀錄一下新特性的內容吧！

### 1. Includes Two New Middleware
新增兩個Middleware分別是TrimStrings與ConvertEmptyStringsToNull，TrimStrings的功能是把進來的Request裡面的內容自動做trim的動作，避免使用者多塞空格進來，ConvertEmptyStringsToNull則是當Request裡面的內容是""空字串的話，會自動轉成NULL方便內容判斷，例如：  
```html
<input type="text" name="vat" value="">
```     
套用前
```php
dd(request('vat'));  
// ''
```    
套用後
```php
dd(request('vat'));    
// null
```
### 2. Automatic Facade’s
快速建立Facade的方式，方法如下：\
**建立**
```php
namespace App;

class Zonda 
{
    public function zurf()
    {
        return ‘Zurfing’;
    }
}
```
**使用**
```php
use Facades\ {
    App\Zonda
};

Route::get('/', function () {
    return Zonda::zurf();
});
```

### 3. Laravel Dusk
Laravel Dusk是一整套新的測試工具包，原本的Laravel測試在遇到AJAX之類的JavaScript時，
因為原本使用的"Symfony BrowserKit"無法支援類似情景就不方便寫測試，
現在Laravel Dusk支援諸如點擊按鈕或連結時的特效，類似拖動或是下拉式選單，
除此之外，也可以進行輸入帳號密碼登入，還有模擬同時開啟多個瀏覽器來測試socket之類的功能，
也會新增.env.dusk來專門用來做測試使用，底層的實作是使用了ChromeDriver與
Facebook Php-webdriver，相信有在寫測試的人會喜歡這個新功能。

### 4. Laravel Elixir Will Be Renamed To Laravel Mix
原本的Elixir將改名為Mix，原因是底層的實作更換掉了，由原本的Gulp全面改成Webpack，
這部分使用者如果本來就有在使用Webpack的應該可以很快上手，其實也只是把本來的設定檔換掉而已。

### 5. You Can Use Markdown in Your Emails
現在可以在Email的內容裡面寫Markdown語法了，使用方式為
```php
return $this->markdown('emails.thanks');
```
除此之外，還可以使用新的Balde帶來的元件，
- button
- footer
- header
- layout
- message
- panel
- promotion
- subcopy
- table

使用方法如下：
```php
@component('mail::button', ['url' => $actionUrl, 'color' => $color])
{{ $actionText }}
@endcomponent
```

### 6. Route improvements are coming to Laravel 5.4
針對Route寫法的改善（原本的寫法還是可以使用），原本的方式：
```php
Route::get('user/{id}/profile', function ($id) {
    //
})->name('profile');
```
改善後的方式：
```php
Route::name('profile')->get('user/{id}/profile', function ($id) {
    // some closure action...
});
```
這樣改善之後可以對於找route的命名有一定的幫助，不然每次當route很多，開發者太多沒好好按照格式寫的話，往往都會找name找得很辛苦。
另外也可以使用以下幾種寫法，

**Registering a route name and a middleware**
```php
Route::name('users.index')->middleware('auth')->get('users', function () {
    // some closure action...
});
```
**Registering a middleware with a route prefix and group**
```php
Route::middleware('auth')->prefix('api')->group(function () {
    // register some routes...
});
```
**Registering a middleware to a resource controller**
```php
Route::middleware('auth')->resource('photo', 'PhotoController');
```

### 7. JSON Based Language Files
針對多語系的處理方法新增了一個函數 `__()`，使用上如下：
```php
__("Please enter your 4-digit verification number:")
```
而在語系檔裡面就會從原本的 `resources/lang/en/auth.php`變成 `resources/lang/en.json`
使用json檔做語系設定，內容改成：
```json
{"Please enter your 4-digit verification number:": "men fadlak adkhel raqam al tareef"}
```
當要使用參數帶入的時候，使用方式如下：
```php
__(
    "Hello :name, you have :unread messages", 
    ['name' => $user->name, 'unread' => $notifications->count]
)
```
而在Blade裡面也可以使用，方式如下：
```
@trans(['name' => $user->name, 'unread' => $notifications->count])
    Hello :name, you have :unread messages.
@endtrans
```

### 8. Laravel Blade Components and Slots 
Blade新增了一種加Slots的方式，
```html
// inc/alert.blade.php
<div class="alert">
    {{ $slot }}
</div>

//---

// home.blade.php
@extends('welcome')

@section('content')
<div>
    <h1>Home Page</h1>
    @component('inc.alert')
        This is the alert message here.
    @endcomponent
</div>
@endsection
```
@component裡面的內容會自動放進$slots裡面，另一種利用方式可以取代原本的extends與yield的作法，
```html
// layouts/app.blade.php
<html>
    <head>
        <title>{{ $title or 'Laravel News' }}</title>
    </head>

    <body>
        <div class="container">
            {{ $slot }}
        </div>
    </body>
</html>

//---

// home.blade.php
@component('layouts.app')
    @slot('title')
        Home Page
    @endslot

    <div class="col-6">
        @component('inc.alert')
            This is the alert message here.
        @endcomponent
        <h1>Welcome</h1>
    </div>
    <div class="col-6">
        @component('inc.sidebar')
            This is my sidebar text. 
        @endcomponent
    </div>
@endcomponent
```
`@slot`會把內容放進宣告的變數裡面，上例的情況就是'title'。
### 9. Higher Order Messaging for Collections
針對Collections需要處理集合中每個元素時，原本的作法會是類似：
```php
$invoices->each(function($invoice) {
    $invoice->pay();
});
```
現在可以直接使用如下的方式：
```php
$invoices->each->pay();
```
這改進包含所有的fallback寫法的function，例如：
```php
$employees->reject(function($employee) {
    return $employee->retired; 
})->each(function($employee){
    $employee->sendPayment();
});
```
也可以改寫成
```php
$employees->reject->retired->each->sendPayment();
```

---

以上9項是Laravel 5.4的新特性簡介，英文原文連結

[https://laravel-news.com/category/laravel-5.4](https://laravel-news.com/category/laravel-5.4)