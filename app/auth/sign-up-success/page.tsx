import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                注册已提交
              </CardTitle>
              <CardDescription>请检查邮箱完成确认。</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                如果 Supabase 开启了邮箱确认，你需要先点击邮件中的确认链接，再回到系统登录。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
