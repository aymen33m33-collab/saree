import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Clock, CheckCircle, XCircle, Eye, Loader, RefreshCw, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  notes?: string;
  paymentMethod: string;
  items: string; // JSON string from database
  subtotal: string;
  deliveryFee: string;
  total: string;
  totalAmount: string;
  restaurantId: string;
  restaurantName?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  estimatedTime?: string;
  driverEarnings: string;
  customerId?: string;
  parsedItems?: OrderItem[]; // Add this for processed orders
}

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  restaurantId?: string;
  restaurantName?: string;
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // استخدام رقم هاتف تجريبي للعميل - في التطبيق الحقيقي سيأتي من نظام المصادقة
  const customerPhone = '+967771234567';

  // جلب الطلبات من قاعدة البيانات مع تحديث تلقائي
  const { data: orders = [], isLoading, error, refetch } = useQuery<Order[]>({
    queryKey: ['orders', customerPhone],
    queryFn: async () => {
      const response = await fetch(`/api/orders/customer/${encodeURIComponent(customerPhone)}`);
      if (!response.ok) {
        throw new Error('فشل في جلب الطلبات');
      }
      const data = await response.json();
      
      // معالجة كل طلب لتحليل العناصر وجلب اسم المطعم
      const processedOrders = await Promise.all(data.map(async (order: Order) => {
        let parsedItems: OrderItem[] = [];
        try {
          parsedItems = JSON.parse(order.items);
        } catch (e) {
          console.error('خطأ في تحليل عناصر الطلب:', e);
        }
        
        // محاولة الحصول على اسم المطعم من العناصر إذا لم يكن متوفراً
        let restaurantName = order.restaurantName;
        if (!restaurantName && parsedItems.length > 0 && parsedItems[0].restaurantName) {
          restaurantName = parsedItems[0].restaurantName;
        } else if (!restaurantName) {
          restaurantName = 'مطعم غير معروف';
        }
        
        return {
          ...order,
          restaurantName,
          parsedItems
        };
      }));
      
      setLastUpdateTime(Date.now());
      return processedOrders;
    },
    retry: 1,
    refetchInterval: 10000, // تحديث كل 10 ثوانِ
  });

  // استخدام الطلبات من قاعدة البيانات مباشرة
  const displayOrders = orders;

  const getStatusLabel = (status: string) => {
    const statusMap = {
      pending: 'قيد المراجعة',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      on_way: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-blue-500',
      preparing: 'bg-orange-500',
      on_way: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const iconMap = {
      pending: Clock,
      confirmed: Package,
      preparing: Package,
      on_way: Package,
      delivered: CheckCircle,
      cancelled: XCircle
    };
    return iconMap[status as keyof typeof iconMap] || Clock;
  };

  const filteredOrders = displayOrders.filter(order => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return ['pending', 'confirmed', 'preparing', 'on_way'].includes(order.status);
    if (selectedTab === 'completed') return order.status === 'delivered';
    if (selectedTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const handleViewOrder = (orderId: string) => {
    setLocation(`/orders/${orderId}`);
  };

  const handleReorder = (order: Order) => {
    toast({
      title: "جاري إعادة الطلب",
      description: `سيتم إضافة عناصر طلب ${order.orderNumber} إلى السلة`,
    });
  };

  const tabs = [
    { id: 'all', label: 'جميع الطلبات', count: displayOrders.length },
    { id: 'active', label: 'النشطة', count: displayOrders.filter(o => ['pending', 'confirmed', 'preparing', 'on_way'].includes(o.status)).length },
    { id: 'completed', label: 'المكتملة', count: displayOrders.filter(o => o.status === 'delivered').length },
    { id: 'cancelled', label: 'الملغية', count: displayOrders.filter(o => o.status === 'cancelled').length }
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">جاري تحميل طلباتك...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">حدث خطأ في تحميل الطلبات</p>
          <Button onClick={() => window.location.reload()} className="bg-red-500 hover:bg-red-600">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">طلباتي</h1>
              <p className="text-sm text-gray-500">تتبع ومراجعة طلباتك</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-md mx-auto p-4">
        {/* مؤشر التحديث التلقائي */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>آخر تحديث: {new Date(lastUpdateTime).toLocaleTimeString('ar-YE')}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="text-xs relative"
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="space-y-4">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    {isLoading ? 'جاري تحميل طلباتك...' : 
                     error ? 'حدث خطأ في تحميل الطلبات. يرجى المحاولة مرة أخرى.' :
                     'لا توجد طلبات حالياً. ستظهر طلباتك هنا عند إنشائها.'}
                  </AlertDescription>
                </Alert>
                
                {!isLoading && !error && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">لا توجد طلبات</h3>
                      <p className="text-gray-500 mb-4">لم تقم بأي طلبات بعد</p>
                      <Button onClick={() => setLocation('/')} data-testid="button-start-ordering">
                        ابدأ الطلب الآن
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = getStatusIcon(order.status);
                
                return (
                  <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">{order.restaurantName}</CardTitle>
                          <p className="text-sm text-gray-500">طلب رقم: {order.orderNumber}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleString('ar-YE')}
                          </p>
                        </div>
                        <Badge 
                          className={`${getStatusColor(order.status)} text-white`}
                          data-testid={`badge-status-${order.status}`}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Order Items */}
                      <div className="space-y-2">
                        {order.parsedItems?.map((item: OrderItem, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">{item.price} ر.س</span>
                          </div>
                        )) || (
                          <div className="text-sm text-gray-500">
                            لا توجد تفاصيل العناصر
                          </div>
                        )}
                      </div>

                      {/* Order Summary */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>عدد الأصناف: {order.parsedItems?.reduce((sum: number, item: OrderItem) => sum + item.quantity, 0) || 0}</span>
                          <span>المجموع: {order.totalAmount} ر.س</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>تاريخ الطلب: {new Date(order.createdAt).toLocaleDateString('ar-SA')}</span>
                          {order.estimatedTime && (
                            <span>الوقت المتوقع: {order.estimatedTime}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>العنوان: {order.deliveryAddress}</span>
                          <span>الدفع: {order.paymentMethod === 'cash' ? 'نقدي' : 'إلكتروني'}</span>
                        </div>
                        
                        {/* مؤشر التحديث المباشر للطلبات النشطة */}
                        {['pending', 'confirmed', 'preparing', 'on_way'].includes(order.status) && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>تحديث مباشر مفعل</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewOrder(order.id)}
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {['pending', 'confirmed', 'preparing', 'on_way'].includes(order.status) ? 'تتبع مباشر' : 'عرض التفاصيل'}
                        </Button>
                        
                        {order.status === 'delivered' && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleReorder(order)}
                            data-testid={`button-reorder-${order.id}`}
                          >
                            إعادة الطلب
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}